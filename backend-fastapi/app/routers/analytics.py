from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from app.dependencies.auth import get_current_user_id
from app.sql.database import get_session_factory, sql_enabled
from app.sql.models import InterviewSummary, QuestionScore

router = APIRouter()


def _compute_streak(active_dates: set[date]) -> int:
    """Consecutive-day streak ending today (or yesterday, so a streak survives
    until the user has actually missed a full day of practice)."""

    if not active_dates:
        return 0

    today = datetime.now(timezone.utc).date()
    cursor = today if today in active_dates else today - timedelta(days=1)

    streak = 0
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


@router.get("/overview")
async def get_analytics_overview(user_id: str = Depends(get_current_user_id)):
    session_factory = get_session_factory()

    if not sql_enabled() or session_factory is None:
        raise HTTPException(status_code=503, detail="Analytics database not configured")

    interview_filter = (
        InterviewSummary.user_id == user_id,
        InterviewSummary.purpose == "Interview",
    )

    async with session_factory() as session:
        totals = await session.execute(
            select(
                func.count(InterviewSummary.id),
                func.avg(InterviewSummary.total_score),
            ).where(*interview_filter)
        )
        total_interviews, avg_score = totals.one()

        by_topic = await session.execute(
            select(
                InterviewSummary.topic,
                func.avg(InterviewSummary.total_score).label("avg_score"),
                func.count(InterviewSummary.id).label("count"),
            )
            .where(*interview_filter)
            .group_by(InterviewSummary.topic)
            .order_by(func.avg(InterviewSummary.total_score).desc())
        )
        by_topic_rows = by_topic.all()

        by_difficulty = await session.execute(
            select(
                InterviewSummary.difficulty,
                func.avg(InterviewSummary.total_score).label("avg_score"),
                func.count(InterviewSummary.id).label("count"),
            )
            .where(*interview_filter)
            .group_by(InterviewSummary.difficulty)
            .order_by(func.avg(InterviewSummary.total_score).desc())
        )

        questions = await session.execute(
            select(
                InterviewSummary.topic,
                QuestionScore.question_text,
                QuestionScore.score,
            )
            .join(InterviewSummary, QuestionScore.summary_id == InterviewSummary.id)
            .where(InterviewSummary.user_id == user_id)
            .order_by(InterviewSummary.topic, QuestionScore.score.asc())
        )

        active_dates_result = await session.execute(
            select(func.date(InterviewSummary.completed_at)).where(*interview_filter).distinct()
        )
        active_dates = {row[0] for row in active_dates_result.all() if row[0] is not None}

    questions_by_topic: dict[str, list[dict]] = {}
    for row in questions:
        questions_by_topic.setdefault(row.topic, []).append(
            {"question": row.question_text, "score": row.score}
        )

    thirty_days_ago = datetime.now(timezone.utc).date() - timedelta(days=29)
    daily_activity = [
        {
            "date": d.isoformat(),
            "count": sum(1 for ad in active_dates if ad == d),
        }
        for d in (thirty_days_ago + timedelta(days=i) for i in range(30))
    ]

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
            for row in by_topic_rows
        ],
        "byDifficulty": [
            {
                "difficulty": row.difficulty,
                "averageScore": round(float(row.avg_score or 0), 2),
                "count": row.count,
            }
            for row in by_difficulty
        ],
        "questionsByTopic": [
            {"topic": topic, "questions": qs} for topic, qs in questions_by_topic.items()
        ],
        "consistency": {
            "currentStreakDays": _compute_streak(active_dates),
            "activeDaysLast30": daily_activity,
        },
    }
