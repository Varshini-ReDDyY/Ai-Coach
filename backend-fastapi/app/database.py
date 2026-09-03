from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.config import settings
from app.models.interview import Interview
from app.models.resume_chunk import ResumeChunk
from app.models.user import User

client: AsyncMongoClient | None = None


async def init_db() -> None:
    global client
    client = AsyncMongoClient(settings.mongo_uri)
    await init_beanie(
        database=client.get_default_database(),
        document_models=[User, Interview, ResumeChunk],
    )
