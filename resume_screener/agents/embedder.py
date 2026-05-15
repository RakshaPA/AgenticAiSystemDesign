# resume_screener/agents/embedder.py
"""
Embedding Agent
Converts resume text and JD text into vectors for fast similarity pre-filtering.
Uses OpenAI text-embedding-3-small (1536-dim) via LiteLLM or direct call.
Swap to any embedding model — interface stays the same.
"""
import os
import numpy as np
from anthropic import AsyncAnthropic
import httpx

EMBEDDING_MODEL = "text-embedding-3-small"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def get_embedding(text: str) -> list[float]:
    """Get 1536-dim embedding vector for text."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={"input": text[:8000], "model": EMBEDDING_MODEL}  # truncate for safety
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]

def cosine_similarity(vec_a: list, vec_b: list) -> float:
    """Compute cosine similarity between two vectors."""
    a, b = np.array(vec_a), np.array(vec_b)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# --- pgvector DB query (used in bulk screening) ---
async def find_similar_resumes(jd_embedding: list, threshold: float, db_session, job_id: str):
    """
    Query pgvector for resumes above similarity threshold.
    Returns resume IDs that pass the vector filter.
    """
    from sqlalchemy import text
    embedding_str = str(jd_embedding)
    result = await db_session.execute(
        text("""
            SELECT id, 1 - (embedding <=> :jd_emb::vector) AS similarity
            FROM resumes
            WHERE job_id = :job_id
              AND embedding IS NOT NULL
              AND 1 - (embedding <=> :jd_emb::vector) >= :threshold
            ORDER BY similarity DESC
        """),
        {"jd_emb": embedding_str, "job_id": job_id, "threshold": threshold}
    )
    return result.fetchall()  # [(resume_id, similarity_score), ...]