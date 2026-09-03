from datetime import datetime, timezone
from typing import Annotated, List

from beanie import Document, Indexed, PydanticObjectId
from pydantic import ConfigDict, Field


class ResumeChunk(Document):
    model_config = ConfigDict(populate_by_name=True)

    interview_id: Annotated[PydanticObjectId, Indexed()] = Field(alias="interviewId")
    user_id: PydanticObjectId = Field(alias="userId")
    chunk_index: int = Field(alias="chunkIndex")
    text: str
    embedding: List[float]
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="createdAt"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt"
    )

    class Settings:
        name = "resumechunks"
