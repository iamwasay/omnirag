import os
import requests
from dotenv import load_dotenv
from app.vector_store import search_chunks

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def unique_sources(matches):
    """
    Remove duplicate source names.
    """

    seen = set()
    sources = []

    for match in matches:
        metadata = match.get("metadata", {})
        source = metadata.get("source", "unknown")

        if source not in seen:
            seen.add(source)
            sources.append(source)

    return sources


def generate_answer(query, session_id, source_file=None):

    # Search only current session
    matches = search_chunks(
        query=query, session_id=session_id, top_k=5, source_file=source_file
    )

    # No results found
    if not matches:
        return {
            "answer": "No matching information was found in the selected document(s).",
            "sources": [],
        }

    # Build context
    context = "\n\n".join(
        [
            match.get("metadata", {}).get("text", "")
            for match in matches
            if match.get("metadata", {}).get("text")
        ]
    )

    prompt = f"""
You are an enterprise compliance assistant.

Answer ONLY from the provided context.

If the answer is not present in the context,
say you could not find the answer.

Context:
{context}

Question:
{query}

Answer:
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
    }

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=data,
        timeout=60,
    )

    result = response.json()

    print("GROQ RESPONSE:")
    print(result)

    # Safe error handling
    if "choices" not in result:
        return {
            "answer": f"Groq API Error: {result}",
            "sources": unique_sources(matches),
        }

    answer = result["choices"][0]["message"]["content"]

    return {"answer": answer, "sources": unique_sources(matches)}
