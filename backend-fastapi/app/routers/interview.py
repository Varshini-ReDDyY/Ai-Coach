import re
import json

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.dependencies.auth import get_current_user_id
from app.models.interview import Answer, Attempt, Interview
from app.models.resume_chunk import ResumeChunk
from app.schemas.interview import (
    CreateInterviewRequest,
    FinishLearningRequest,
    GenerateQuestionsRequest,
    IdealAnswerRequest,
    SubmitInterviewRequest,
)
from app.sql.analytics import record_interview_summary
from app.utils.embeddings import embed_text, embed_texts
from app.utils.gemini import generate_content
from app.utils.pdf_extractor import extract_pdf_text
from app.utils.text_chunker import chunk_text

router = APIRouter()

MAX_RESUME_SIZE = 5 * 1024 * 1024


# ======================================
# SERIALIZATION (matches the JSON shape the frontend expects)
# ======================================
def serialize_answer(answer: Answer) -> dict:
    return {
        "question": answer.question,
        "answer": answer.answer,
        "idealAnswer": answer.ideal_answer,
        "feedback": answer.feedback,
        "score": answer.score,
    }


def serialize_attempt(attempt: Attempt) -> dict:
    return {
        "attemptNumber": attempt.attempt_number,
        "totalScore": attempt.total_score,
        "isLearning": attempt.is_learning,
        "duration": attempt.duration,
        "answers": [serialize_answer(a) for a in attempt.answers],
        "completedAt": attempt.completed_at.isoformat(),
    }


def serialize_interview(interview: Interview) -> dict:
    return {
        "_id": str(interview.id),
        "userId": str(interview.user_id),
        "role": interview.role,
        "company": interview.company,
        "experience": interview.experience,
        "topic": interview.topic,
        "difficulty": interview.difficulty,
        "purpose": interview.purpose.value,
        "questions": interview.questions,
        "attempts": [serialize_attempt(a) for a in interview.attempts],
        "createdAt": interview.created_at.isoformat(),
        "updatedAt": interview.updated_at.isoformat(),
    }


async def get_owned_interview(interview_id: str, user_id: str) -> Interview:
    try:
        oid = PydanticObjectId(interview_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview = await Interview.get(oid)

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if str(interview.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this interview")

    return interview


# ======================================
# CREATE INTERVIEW
# ======================================
@router.post("/create")
async def create_interview(
    body: CreateInterviewRequest, user_id: str = Depends(get_current_user_id)
):
    interview = Interview(user_id=PydanticObjectId(user_id), **body.model_dump())
    await interview.insert()

    return {"success": True, "interviewId": str(interview.id)}


# ======================================
# UPLOAD RESUME (RAG INDEXING)
# ======================================
@router.post("/upload-resume")
async def upload_resume(
    interviewId: str = Form(...),
    resume: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    interview = await get_owned_interview(interviewId, user_id)

    file_bytes = await resume.read()
    if len(file_bytes) > MAX_RESUME_SIZE:
        raise HTTPException(status_code=400, detail="Resume file too large")

    text = extract_pdf_text(file_bytes)
    chunks = chunk_text(text)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract any text from resume")

    embeddings = await embed_texts(chunks)

    await ResumeChunk.find(ResumeChunk.interview_id == interview.id).delete()

    docs = [
        ResumeChunk(
            interview_id=interview.id,
            user_id=PydanticObjectId(user_id),
            chunk_index=i,
            text=chunk,
            embedding=embeddings[i],
        )
        for i, chunk in enumerate(chunks)
    ]
    await ResumeChunk.insert_many(docs)

    return {"success": True, "chunksIndexed": len(chunks)}


# ======================================
# RETRIEVE RELEVANT RESUME SECTIONS
# ======================================
async def get_resume_context(interview_id: PydanticObjectId, role: str, topic: str, difficulty: str) -> str:
    has_resume = await ResumeChunk.find_one(ResumeChunk.interview_id == interview_id)

    if not has_resume:
        return ""

    query_text = f"{role} {topic} {difficulty} projects technologies skills experience"
    query_embedding = await embed_text(query_text)

    collection = ResumeChunk.get_pymongo_collection()

    cursor = await collection.aggregate(
        [
            {
                "$vectorSearch": {
                    "index": "resume_vector_index",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 100,
                    "limit": 5,
                    "filter": {"interviewId": interview_id},
                }
            },
            {"$project": {"text": 1}},
        ]
    )

    relevant_chunks = [doc async for doc in cursor]
    return "\n\n".join(chunk["text"] for chunk in relevant_chunks)


# ======================================
# GENERATE QUESTIONS
# ======================================
@router.post("/generate")
async def generate_questions(
    body: GenerateQuestionsRequest, user_id: str = Depends(get_current_user_id)
):
    resume_context = ""

    if body.interviewId:
        resume_context = await get_resume_context(
            PydanticObjectId(body.interviewId), body.role, body.topic, body.difficulty
        )

    resume_block = (
        f"\nCandidate Resume Context:\n{resume_context}\n\n"
        "Personalize the questions around the candidate's actual projects, "
        "technologies, and experience from the resume context above wherever relevant.\n"
        if resume_context
        else ""
    )

    if body.purpose.value == "Learning":
        prompt = f"""
Generate {body.count} interview questions.

Role: {body.role}
Company: {body.company}
Experience: {body.experience}
Topic: {body.topic}
Difficulty: {body.difficulty}
{resume_block}
For EACH question also provide a detailed ideal answer.

Return ONLY valid JSON.

Example:

[
{{
"question":"What is DBMS?",
"idealAnswer":"DBMS is software used to..."
}},
{{
"question":"Explain ACID properties.",
"idealAnswer":"ACID stands for..."
}}
]
"""
    else:
        prompt = f"""
Generate {body.count} interview questions.

Role: {body.role}
Company: {body.company}
Experience: {body.experience}
Topic: {body.topic}
Difficulty: {body.difficulty}
{resume_block}
Return ONLY the questions.
One question per line.
"""

    try:
        result = await generate_content(prompt)

        if body.purpose.value == "Learning":
            match = re.search(r"\[[\s\S]*\]", result)
            if not match:
                raise ValueError("Invalid JSON from Gemini")

            return {"success": True, "learningData": json.loads(match.group(0))}

        questions = [
            re.sub(r"^\d+\.\s*", "", line).strip()
            for line in result.split("\n")
            if line.strip()
        ]

        return {"success": True, "questions": questions}

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ======================================
# SUBMIT INTERVIEW
# ======================================
@router.post("/submit")
async def submit_interview(
    body: SubmitInterviewRequest, user_id: str = Depends(get_current_user_id)
):
    interview = await get_owned_interview(body.interviewId, user_id)

    evaluated_answers = []
    total_score = 0.0

    for i, question in enumerate(body.questions):
        candidate_answer = body.answers[i] if i < len(body.answers) else ""

        prompt = f"""
You are an expert technical interviewer.

Question:
{question}

Candidate Answer:
{candidate_answer or "No Answer"}

Evaluate the answer.

Return ONLY valid JSON.

{{
"score":8,
"feedback":"...",
"idealAnswer":"..."
}}
"""

        score = 0.0
        feedback = ""
        ideal_answer = ""

        try:
            response = await generate_content(prompt)
            match = re.search(r"\{[\s\S]*\}", response)

            if not match:
                raise ValueError("Invalid JSON")

            result = json.loads(match.group(0))
            score = float(result.get("score") or 0)
            feedback = result.get("feedback") or ""
            ideal_answer = result.get("idealAnswer") or ""
        except Exception:
            score = 0.0
            feedback = "AI Evaluation Failed"
            ideal_answer = ""

        total_score += score

        evaluated_answers.append(
            Answer(
                question=question,
                answer=candidate_answer,
                score=score,
                feedback=feedback,
                ideal_answer=ideal_answer,
            )
        )

    interview.questions = body.questions

    new_attempt = Attempt(
        attempt_number=len(interview.attempts) + 1,
        total_score=total_score,
        duration=body.duration,
        answers=evaluated_answers,
    )

    interview.attempts.append(new_attempt)
    await interview.save()

    used_resume_context = bool(
        await ResumeChunk.find_one(ResumeChunk.interview_id == interview.id)
    )

    await record_interview_summary(
        mongo_interview_id=str(interview.id),
        user_id=user_id,
        role=interview.role,
        company=interview.company,
        topic=interview.topic,
        difficulty=interview.difficulty,
        purpose=interview.purpose.value,
        total_score=total_score,
        max_score=len(body.questions) * 10,
        duration_seconds=body.duration,
        used_resume_context=used_resume_context,
        completed_at=new_attempt.completed_at,
        questions=[(a.question, a.score) for a in evaluated_answers],
    )

    return {
        "success": True,
        "interview": serialize_interview(interview),
        "attempt": serialize_attempt(new_attempt),
    }


# ======================================
# GET INTERVIEW HISTORY
# ======================================
@router.get("/history")
async def get_history(user_id: str = Depends(get_current_user_id)):
    interviews = (
        await Interview.find(
            Interview.user_id == PydanticObjectId(user_id),
            {"attempts.0": {"$exists": True}},
        )
        .sort(-Interview.created_at)
        .to_list()
    )

    return {"success": True, "interviews": [serialize_interview(i) for i in interviews]}


# ======================================
# GET IDEAL ANSWER (LEARNING MODE)
# ======================================
@router.post("/ideal-answer")
async def get_ideal_answer(
    body: IdealAnswerRequest, user_id: str = Depends(get_current_user_id)
):
    prompt = f"""
You are an expert software engineering interviewer.

Provide a detailed interview answer for the following question.

Question:
{body.question}

Requirements:
- Easy to understand
- 150-250 words
- Include important concepts
- Give interview-quality explanation

Return ONLY the answer.
"""

    try:
        ideal_answer = await generate_content(prompt)
        return {"success": True, "idealAnswer": ideal_answer}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ======================================
# FINISH LEARNING SESSION
# ======================================
@router.post("/finish-learning")
async def finish_learning(
    body: FinishLearningRequest, user_id: str = Depends(get_current_user_id)
):
    interview = await get_owned_interview(body.interviewId, user_id)

    new_attempt = Attempt(
        attempt_number=len(interview.attempts) + 1,
        is_learning=True,
        total_score=0,
        answers=[
            Answer(question=a.question, ideal_answer=a.idealAnswer) for a in body.answers
        ],
    )

    interview.attempts.append(new_attempt)
    await interview.save()

    return {
        "success": True,
        "interview": serialize_interview(interview),
        "attempt": serialize_attempt(new_attempt),
    }


# ======================================
# DELETE INTERVIEW
# ======================================
@router.delete("/delete/{interview_id}")
async def delete_interview(interview_id: str, user_id: str = Depends(get_current_user_id)):
    interview = await get_owned_interview(interview_id, user_id)

    await ResumeChunk.find(ResumeChunk.interview_id == interview.id).delete()
    await interview.delete()

    return {"success": True, "message": "Interview deleted successfully"}
