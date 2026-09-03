from datetime import datetime
from typing import Iterable

from app.sql.database import get_session_factory, sql_enabled
from app.sql.models import InterviewSummary, QuestionScore


async def record_interview_summary(
    *,
    mongo_interview_id: str,
    user_id: str,
    role: str,
    company: str,
    topic: str,
    difficulty: str,
    purpose: str,
    total_score: float,
    max_score: float,
    duration_seconds: float,
    used_resume_context: bool,
    completed_at: datetime,
    questions: Iterable[tuple[str, float]],
) -> None:
    """Best-effort write to the relational analytics store. Never lets a SQL
    failure break the MongoDB-backed submit flow that already succeeded."""

    session_factory = get_session_factory()

    if not sql_enabled() or session_factory is None:
        return

    try:
        async with session_factory() as session:
            summary = InterviewSummary(
                mongo_interview_id=mongo_interview_id,
                user_id=user_id,
                role=role,
                company=company,
                topic=topic,
                difficulty=difficulty,
                purpose=purpose,
                total_score=total_score,
                max_score=max_score,
                duration_seconds=duration_seconds,
                used_resume_context=used_resume_context,
                completed_at=completed_at,
                questions=[
                    QuestionScore(question_text=question_text, score=score)
                    for question_text, score in questions
                ],
            )
            session.add(summary)
            await session.commit()
    except Exception as error:
        print(f"[analytics] failed to record interview summary: {error}")
