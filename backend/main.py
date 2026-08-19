"""ClaimWise AI — FastAPI backend entry point.

Full pipeline: PDF upload → text extraction → LLM structured extraction →
deterministic signals → cosine similarity retrieval → LLM triage →
safety override → SQLite persist → REST API.
"""

import os
import uuid
import shutil
import traceback

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from dotenv import load_dotenv

load_dotenv()

from pdf_extract import extract_text, generate_sample_pdfs
from llm_extract import extract_structured_claim
from signals import compute_signals
from retrieval import retrieve_similar_claims
from triage_engine import run_triage
from safety_override import apply_safety_override
from db import init_db, save_claim, save_triage_result, get_all_claims, get_claim, get_claim_summary, save_feedback, get_feedback

app = FastAPI(title="ClaimWise AI", version="0.1.0")

# CORS — allow all origins (hackathon scope)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory for PDFs
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.on_event("startup")
def startup():
    """Initialize database and generate sample PDFs on first run."""
    init_db()
    # Generate sample PDFs if they don't exist
    sample_dir = os.path.join(os.path.dirname(__file__), "data", "sample_pdfs")
    if not os.path.exists(sample_dir) or not os.listdir(sample_dir):
        generate_sample_pdfs(sample_dir)
        print("[startup] Sample PDFs generated.")
    print("[startup] ClaimWise AI ready.")


# ─── Health Check ─────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# ─── Upload & Process Claim ──────────────────────────────────

@app.post("/api/claims/upload")
async def upload_claim(file: UploadFile = File(...)):
    """Accept a PDF, run the full triage pipeline, return the TriageResult.

    Pipeline: extract text → LLM structured extraction → deterministic signals →
    cosine similarity retrieval → LLM triage → safety override → persist → return.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Save uploaded file
    file_id = str(uuid.uuid4())[:8]
    filename = f"{file_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        # Step 1: Extract text from PDF
        raw_text = extract_text(filepath)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="PDF contains no extractable text.")

        # Step 2: LLM structured extraction
        structured_claim = extract_structured_claim(raw_text)

        # Step 3: Compute deterministic signals
        sigs = compute_signals(structured_claim)

        # Step 4: Retrieve similar historical claims
        retrieved = retrieve_similar_claims(structured_claim.narrative, top_k=5)

        # Step 5: LLM triage (current-state-first reasoning)
        triage_result = run_triage(structured_claim, sigs, retrieved)

        # Step 6: Apply safety override
        triage_result = apply_safety_override(triage_result)

        # Step 7: Persist to SQLite
        save_claim(structured_claim.model_dump(), raw_text=raw_text)
        save_triage_result(triage_result.model_dump())

        return {
            "status": "success",
            "claim": structured_claim.model_dump(),
            "triage_result": triage_result.model_dump(),
            "signals": sigs,
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


# ─── List All Claims ─────────────────────────────────────────

@app.get("/api/claims")
def list_claims():
    """List all processed claims, sorted by priority_score descending."""
    claims = get_all_claims()
    return {"claims": claims, "count": len(claims)}


# ─── Claim Summary (lightweight) ─────────────────────────────

@app.get("/api/claims/{claim_id}/summary")
def get_claim_summary_route(claim_id: str):
    """Lightweight summary for the AI Summary Panel — reads cached data, no LLM call."""
    summary = get_claim_summary(claim_id)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found.")
    return summary


# ─── Get Single Claim ────────────────────────────────────────

@app.get("/api/claims/{claim_id}")
def get_claim_detail(claim_id: str):
    """Get full detail for a single claim including triage result."""
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found.")
    # Also get feedback
    fb = get_feedback(claim_id)
    return {"claim": claim, "feedback": fb}


# ─── Submit Feedback ──────────────────────────────────────────

class FeedbackRequest(BaseModel):
    handler_action: str  # e.g., "APPROVED", "MODIFIED", "ESCALATED"
    notes: str = ""


@app.post("/api/claims/{claim_id}/feedback")
def submit_feedback(claim_id: str, req: FeedbackRequest):
    """Handler approve/modify/escalate — writes to feedback table."""
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found.")
    save_feedback(claim_id, req.handler_action, req.notes)
    return {"status": "ok", "claim_id": claim_id, "action": req.handler_action}


# ─── Run with Uvicorn ────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
