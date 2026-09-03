from datetime import datetime, timezone
from enum import Enum
from typing import List

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field


class Purpose(str, Enum):
    interview = "Interview"
    learning = "Learning"


class Answer(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str
    answer: str = ""
    ideal_answer: str = Field(default="", alias="idealAnswer")
    feedback: str = ""
    score: float = 0


class Attempt(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    attempt_number: int = Field(alias="attemptNumber")
    total_score: float = Field(default=0, alias="totalScore")
    is_learning: bool = Field(default=False, alias="isLearning")
    duration: float = 0
    answers: List[Answer] = []
    completed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="completedAt"
    )


class Interview(Document):
    model_config = ConfigDict(populate_by_name=True)

    user_id: PydanticObjectId = Field(alias="userId")
    role: str = ""
    company: str = ""
    experience: str = ""
    topic: str = ""
    difficulty: str = ""
    purpose: Purpose = Purpose.interview
    questions: List[str] = []
    attempts: List[Attempt] = []
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="createdAt"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt"
    )

    class Settings:
        name = "interviews"
