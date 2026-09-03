from typing import List

from google import genai

from app.config import settings
from app.utils.gemini_retry import call_with_retry

client = genai.Client(api_key=settings.gemini_api_key)

EMBEDDING_MODEL = "models/gemini-embedding-001"


async def embed_text(text: str) -> List[float]:
    async def _call() -> List[float]:
        result = await client.aio.models.embed_content(model=EMBEDDING_MODEL, contents=text)
        return result.embeddings[0].values

    return await call_with_retry(_call)


async def embed_texts(texts: List[str]) -> List[List[float]]:
    async def _call() -> List[List[float]]:
        result = await client.aio.models.embed_content(model=EMBEDDING_MODEL, contents=texts)
        return [embedding.values for embedding in result.embeddings]

    return await call_with_retry(_call)
