import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from pymongo import AsyncMongoClient

from app.config import settings

INDEX_NAME = "resume_vector_index"

INDEX_DEFINITION = {
    "fields": [
        {
            "type": "vector",
            "path": "embedding",
            "numDimensions": 3072,
            "similarity": "cosine",
        },
        {
            "type": "filter",
            "path": "interviewId",
        },
    ]
}


async def main() -> None:
    client = AsyncMongoClient(settings.mongo_uri)
    db = client.get_default_database()

    existing = await db.list_collection_names()
    if "resumechunks" not in existing:
        await db.create_collection("resumechunks")

    collection = db["resumechunks"]

    try:
        await collection.drop_search_index(INDEX_NAME)
        print(f"Dropped existing '{INDEX_NAME}' index, recreating...")
    except Exception:
        pass

    await collection.create_search_index(
        {
            "name": INDEX_NAME,
            "type": "vectorSearch",
            "definition": INDEX_DEFINITION,
        }
    )

    print(
        f"Vector search index '{INDEX_NAME}' creation requested. "
        "It can take a minute to finish building in Atlas."
    )


if __name__ == "__main__":
    asyncio.run(main())
