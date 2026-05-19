from pinecone import Pinecone, ServerlessSpec
from app.embedder import get_embedding
from dotenv import load_dotenv
import os

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

pc = Pinecone(api_key=PINECONE_API_KEY)

# Create index if it does not exist
if INDEX_NAME not in pc.list_indexes().names():
    pc.create_index(
        name=INDEX_NAME,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

index = pc.Index(INDEX_NAME)


def store_chunks(chunks, source_file, session_id):
    """
    Store chunks inside a session-specific namespace.
    """

    vectors = []

    for i, chunk in enumerate(chunks):
        embedding = get_embedding(chunk)

        vectors.append(
            {
                "id": f"{source_file}_{session_id}_{i}",
                "values": embedding,
                "metadata": {
                    "text": chunk,
                    "source": source_file,
                    "session_id": session_id,
                },
            }
        )

    # Store inside session namespace
    index.upsert(vectors=vectors, namespace=session_id)


def search_chunks(query, session_id, top_k=5, source_file=None):
    """
    Search only inside the current session.
    Optional document filtering.
    """

    query_embedding = get_embedding(query)

    filter_conditions = None

    # Filter by selected document
    if source_file:
        filter_conditions = {"source": {"$eq": source_file}}

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=session_id,
        filter=filter_conditions,
    )

    # Pinecone object-safe handling
    matches = getattr(results, "matches", None)

    if matches is None and isinstance(results, dict):
        matches = results.get("matches", [])

    return matches or []
