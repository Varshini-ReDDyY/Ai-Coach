from google import genai

from app.config import settings
from app.utils.gemini_retry import call_with_retry

client = genai.Client(api_key=settings.gemini_api_key)


async def generate_content(prompt: str) -> str:
    async def _call() -> str:
        response = await client.aio.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
        )
        return response.text

    return await call_with_retry(_call)
