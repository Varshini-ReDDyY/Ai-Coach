import re
from typing import List


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> List[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    chunks: List[str] = []

    start = 0
    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        chunks.append(cleaned[start:end].strip())

        if end == len(cleaned):
            break
        start = end - overlap

    return [chunk for chunk in chunks if chunk]
