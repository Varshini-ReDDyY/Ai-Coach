from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class InterviewSummary(Base):
    """One row per completed interview attempt — the relational analytics
    counterpart to the flexible interview/attempt documents stored in MongoDB."""

    __tablename__ = "interview_summaries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mongo_interview_id: Mapped[str] = mapped_column(String(24), index=True)
    user_id: Mapped[str] = mapped_column(String(24), index=True)
    role: Mapped[str] = mapped_column(String(120))
    company: Mapped[str] = mapped_column(String(120))
    topic: Mapped[str] = mapped_column(String(120))
    difficulty: Mapped[str] = mapped_column(String(50))
    purpose: Mapped[str] = mapped_column(String(20))
    total_score: Mapped[float] = mapped_column(Float)
    max_score: Mapped[float] = mapped_column(Float)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0)
    used_resume_context: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    questions: Mapped[list["QuestionScore"]] = relationship(
        back_populates="summary", cascade="all, delete-orphan"
    )


class QuestionScore(Base):
    """One row per evaluated question within an attempt — a many-side table
    joined back to InterviewSummary via a foreign key."""

    __tablename__ = "question_scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    summary_id: Mapped[int] = mapped_column(ForeignKey("interview_summaries.id"))
    question_text: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float)

    summary: Mapped["InterviewSummary"] = relationship(back_populates="questions")
