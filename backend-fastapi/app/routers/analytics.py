from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from app.dependencies.auth import get_current_user_id
from app.sql.database import get_session_factory, sql_enabled
from app.sql.models import InterviewSummary, QuestionScore

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(user_id: str = Depends(get_current_user_id)):
    session_factory = get_session_factory()

    if not sql_enabled() or session_factory is None:
        raise HTTPException(status_code=503, detail="Analytics database not configured")

    async with session_factory() as session:
        totals = await session.execute(
            select(
                func.count(InterviewSummary.id),
                func.avg(InterviewSummary.total_score),
            ).where(
                InterviewSummary.user_id == user_id,
                InterviewSummary.purpose == "Interview",
            )
        )
        total_interviews, avg_score = totals.one()

        by_topic = await session.execute(
            select(
                InterviewSummary.topic,
                func.avg(InterviewSummary.total_score).label("avg_score"),
                func.count(InterviewSummary.id).label("count"),
            )
            .where(
                InterviewSummary.user_id == user_id,
                InterviewSummary.purpose == "Interview",
            )
            .group_by(InterviewSummary.topic)
            .order_by(func.avg(InterviewSummary.total_score).desc())
        )

        weakest_questions = await session.execute(
            select(QuestionScore.question_text, QuestionScore.score, InterviewSummary.topic)
            .join(InterviewSummary, QuestionScore.summary_id == InterviewSummary.id)
            .where(InterviewSummary.user_id == user_id)
            .order_by(QuestionScore.score.asc())
            .limit(5)
        )

    return {
        "success": True,
        "totalInterviews": total_interviews or 0,
        "averageScore": round(float(avg_score or 0), 2),
        "byTopic": [
            {
                "topic": row.topic,
                "averageScore": round(float(row.avg_score or 0), 2),
                "count": row.count,
            }
            for row in by_topic
        ],
        "weakestQuestions": [
            {"question": row.question_text, "score": row.score, "topic": row.topic}
            for row in weakest_questions
        ],
    }
