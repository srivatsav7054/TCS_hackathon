"""Cosine similarity retrieval over sentence-transformer embeddings.

Embeds historical claims once at module load. Uses plain cosine similarity
via sklearn — no FAISS, no vector DB.
"""

import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "historical_claims.json")

# Load model and embed historical claims once at import time
print("[retrieval] Loading sentence-transformer model...")
_model = SentenceTransformer("all-MiniLM-L6-v2")

with open(_DATA_PATH, "r", encoding="utf-8") as f:
    _historical = json.load(f)

_texts = [c["text"] for c in _historical]
print(f"[retrieval] Embedding {len(_texts)} historical claims...")
_embeddings = _model.encode(_texts, show_progress_bar=False)
print("[retrieval] Ready.")


def retrieve_similar_claims(query_text: str, top_k: int = 5) -> list[dict]:
    """Return the top-k most similar historical claims to the query text."""
    query_emb = _model.encode([query_text])
    sims = cosine_similarity(query_emb, _embeddings)[0]
    top_idx = np.argsort(sims)[::-1][:top_k]
    return [
        {**_historical[i], "similarity_score": float(sims[i])}
        for i in top_idx
    ]


if __name__ == "__main__":
    # Standalone test
    test_queries = [
        "Auto collision rear-end accident with whiplash injury",
        "Emergency surgery appendectomy hospital stay",
        "House fire kitchen damage displacement",
    ]

    for query in test_queries:
        print(f"\nQuery: {query}")
        results = retrieve_similar_claims(query, top_k=3)
        for r in results:
            print(f"  {r['claim_id']} (sim={r['similarity_score']:.3f}): {r['text'][:80]}...")

    print("\n[OK] retrieval.py works")
