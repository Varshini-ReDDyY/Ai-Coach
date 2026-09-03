import asyncio
from typing import Awaitable, Callable, TypeVar

from google.genai import errors

T = TypeVar("T")

RETRYABLE_CODES = {429, 503}
MAX_RETRIES = 3
BASE_DELAY_SECONDS = 1


async def call_with_retry(func: Callable[[], Awaitable[T]]) -> T:
    delay = BASE_DELAY_SECONDS

    for attempt in range(MAX_RETRIES + 1):
        try:
            return await func()
        except errors.APIError as error:
            if error.code in RETRYABLE_CODES and attempt < MAX_RETRIES:
                await asyncio.sleep(delay)
                delay *= 2
                continue
            raise
