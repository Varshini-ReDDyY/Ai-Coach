from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.interview import Purpose


class CreateInterviewRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: str = ""
    company: str = ""
    experience: str = ""
    topic: str = ""
    difficulty: str = ""
    purpose: Purpose = Purpose.interview


class GenerateQuestionsRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    interviewId: Optional[str] = None
    role: str = ""
    company: str = ""
    experience: str = ""
    topic: str = ""
    difficulty: str = ""
    count: int = 5
    purpose: Purpose = Purpose.interview


class SubmitInterviewRequest(BaseModel):
    interviewId: str
    questions: List[str]
    answers: List[str]
    duration: int = 0


class IdealAnswerRequest(BaseModel):
    question: str


class FinishLearningAnswer(BaseModel):
    question: str
    idealAnswer: str


class FinishLearningRequest(BaseModel):
    interviewId: str
    answers: List[FinishLearningAnswer]
