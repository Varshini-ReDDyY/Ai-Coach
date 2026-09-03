from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import ConfigDict, EmailStr, Field


class User(Document):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    email: Annotated[EmailStr, Indexed(unique=True)]
    password: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="createdAt"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt"
    )

    class Settings:
        name = "users"
