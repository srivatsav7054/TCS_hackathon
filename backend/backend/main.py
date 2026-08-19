"""ClaimWise AI — FastAPI backend entry point.

Full pipeline: PDF upload -> text extraction -> LLM structured extraction ->
deterministic signals -> cosine similarity retrieval -> LLM triage ->
safety override -> SQLite persist -> REST API.
"""

import os
import uuid
import traceback

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import random
from models import TriageResult, Complexity, Criticality, Team

from dotenv import load_dotenv

load_dotenv()

from pdf_extract import extract_text, generate_sample_pdfs
from llm_extract import extract_structured_claim
from signals import compute_signals
from retrieval import retrieve_similar_claims
from triage_engine import run_triage
from safety_override import apply_safety_override
from db import (
    init_db, save_claim, save_triage_result,
    get_all_claims, get_claim, get_claim_summary,
    save_feedback, get_feedback,
)

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

# Serve uploaded PDFs as static files at /api/documents/<filename>
app.mount("/api/documents", StaticFiles(directory=UPLOAD_DIR), name="documents")

# Serve incoming claim PDFs at /api/incoming/<claim_id>/<filename>
_INCOMING_DIR = os.path.join(os.path.dirname(__file__), "data", "incoming")
os.makedirs(_INCOMING_DIR, exist_ok=True)
app.mount("/api/incoming", StaticFiles(directory=_INCOMING_DIR), name="incoming")


INCOMING_PDF_DIR = os.path.join(os.path.dirname(__file__), "data", "incoming")

@app.on_event("startup")
def startup():
    """Initialize database and generate sample PDFs on first run."""
    init_db()
    _migrate_status_column()
    sample_dir = os.path.join(os.path.dirname(__file__), "data", "sample_pdfs")
    if not os.path.exists(sample_dir) or not os.listdir(sample_dir):
        generate_sample_pdfs(sample_dir)
        print("[startup] Sample PDFs generated.")
    print("[startup] ClaimWise AI ready.")


def _migrate_status_column():
    """Add status column to claims table if not already present."""
    import sqlite3 as _sq
    DB_PATH = os.path.join(os.path.dirname(__file__), "data", "claimwise.db")
    conn = _sq.connect(DB_PATH)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(claims)").fetchall()]
    if "status" not in cols:
        conn.execute("ALTER TABLE claims ADD COLUMN status TEXT DEFAULT 'PENDING'")
        conn.commit()
        print("[migrate] Added 'status' column to claims table.")
    conn.close()


# --- Health Check ------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# --- Shared pipeline helper --------------------------------------------------

async def _save_and_process_files(files: list[UploadFile], existing_raw_text: str = "", existing_doc_urls: dict = None):
    """Save PDFs, extract text, build document_urls dict.

    Returns (combined_raw_text, document_urls).
    """
    if existing_doc_urls is None:
        existing_doc_urls = {}

    document_urls = dict(existing_doc_urls)
    combined_raw_text_parts = [existing_raw_text] if existing_raw_text else []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

        file_id = str(uuid.uuid4())[:8]
        filename = f"{file_id}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        # Logical name: strip .pdf extension, replace underscores with spaces
        logical_name = file.filename.rsplit(".", 1)[0].replace("_", " ")
        document_urls[logical_name] = f"http://localhost:8000/api/documents/{filename}"

        extracted = extract_text(filepath)
        if extracted.strip():
            combined_raw_text_parts.append(extracted)

    return "\n\n".join(combined_raw_text_parts), document_urls


# --- Upload & Process Claim --------------------------------------------------

@app.post("/api/claims/upload")
async def upload_claim(files: list[UploadFile] = File(...)):
    """Accept one or more PDFs, run the full triage pipeline, return the TriageResult.

    Pipeline: extract text -> LLM structured extraction -> deterministic signals ->
    cosine similarity retrieval -> LLM triage -> safety override -> persist -> return.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    raw_text, document_urls = await _save_and_process_files(files)

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="PDFs contain no extractable text.")
        
    try:
        structured_claim = extract_structured_claim(raw_text)
        structured_claim.document_urls = document_urls

        sigs = compute_signals(structured_claim)
        retrieved = retrieve_similar_claims(structured_claim.narrative, top_k=5)
        triage_result = run_triage(structured_claim, sigs, retrieved)
        triage_result = apply_safety_override(triage_result)

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



# --- Append Documents to Existing Claim --------------------------------------

@app.post("/api/claims/{claim_id}/upload")
async def append_documents(claim_id: str, files: list[UploadFile] = File(...)):
    """Append new PDFs to an existing claim and re-run the full triage pipeline."""
    existing = get_claim(claim_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found.")

    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    existing_raw = existing.get("raw_text", "") or ""
    existing_urls = existing.get("document_urls") or {}

    raw_text, document_urls = await _save_and_process_files(
        files, existing_raw_text=existing_raw, existing_doc_urls=existing_urls
    )

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="PDFs contain no extractable text.")

    try:
        structured_claim = extract_structured_claim(raw_text)
        structured_claim.claim_id = claim_id
        structured_claim.document_urls = document_urls

        sigs = compute_signals(structured_claim)
        retrieved = retrieve_similar_claims(structured_claim.narrative, top_k=5)
        triage_result = run_triage(structured_claim, sigs, retrieved)
        triage_result = apply_safety_override(triage_result)

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


    try:
        structured_claim = extract_structured_claim(raw_text)
        # Force the original claim_id so we don't create a duplicate
        structured_claim.claim_id = claim_id
        structured_claim.document_urls = document_urls

        sigs = compute_signals(structured_claim)
        retrieved = retrieve_similar_claims(structured_claim.narrative, top_k=5)
        triage_result = run_triage(structured_claim, sigs, retrieved)
        triage_result.claim_id = claim_id
        triage_result = apply_safety_override(triage_result)

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


# --- List All Claims ---------------------------------------------------------

@app.get("/api/claims")
def list_claims():
    """List all processed claims, sorted by priority_score descending."""
    claims = get_all_claims()
    return {"claims": claims, "count": len(claims)}


# --- Settlements Audit -------------------------------------------------------

@app.get("/api/audit/settlements")
def get_settlements_audit():
    """Return settlement ranges vs approved amounts for all approved claims."""
    claims = get_all_claims()
    
    audit_data = []
    for c in claims:
        # We simulate approved_amount by fetching feedback
        claim_id = c.get("claim_id")
        fb = get_feedback(claim_id)
        # Only include if they have a settlement range and are approved,
        # or just include all of them with dummy approved amounts if no feedback
        
        low = c.get("settlement_low")
        high = c.get("settlement_high")
        if low is not None:
            # If no actual handler action yet, we skip or simulate. 
            # Let's include everything with a dummy approved amount for the hackathon
            approved = low + ((high or low) - low) / 2
            
            audit_data.append({
                "claim_id": claim_id,
                "assigned_team": c.get("assigned_team", "Unknown"),
                "settlement_low": low,
                "settlement_high": high or low,
                "approved_amount": approved,
                "approved_by": fb.get("handler_action") if fb else "System",
            })
            
    return audit_data


# --- Claim Summary (lightweight) ---------------------------------------------

@app.get("/api/claims/{claim_id}/summary")
def get_claim_summary_route(claim_id: str):
    """Lightweight summary for the AI Summary Panel — reads cached data, no LLM call."""
    summary = get_claim_summary(claim_id)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found.")
    return summary


# --- Get Single Claim --------------------------------------------------------

@app.get("/api/claims/{claim_id}")
def get_claim_detail(claim_id: str):
    """Get full detail for a single claim including triage result and status."""
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found.")
    fb = get_feedback(claim_id)
    # Derive current status from feedback history
    status = claim.get("status") or "PENDING"
    # Rewrite document_urls for incoming claims to use served URLs
    doc_urls = claim.get("document_urls") or {}
    rewritten = {}
    for name, url in doc_urls.items():
        if "data/incoming" in url or "data\\incoming" in url:
            # Extract claim_id/filename from path
            parts = url.replace("\\", "/").split("data/incoming/")
            if len(parts) == 2:
                url = f"/api/incoming/{parts[1]}"
        rewritten[name] = url
    claim["document_urls"] = rewritten
    claim["status"] = status
    return {"claim": claim, "triage_result": claim, "feedback": fb, "status": status}


# --- Submit Feedback (Approve / Modify / Escalate) ---------------------------

class FeedbackRequest(BaseModel):
    handler_action: str   # APPROVED | REJECTED | ESCALATED | UNDER_REVIEW | IN_PROCESS
    notes: str = ""


# Map action -> claim status
_ACTION_STATUS = {
    "APPROVED":     "APPROVED",
    "REJECTED":     "REJECTED",
    "ESCALATED":    "ESCALATED",
    "UNDER_REVIEW": "UNDER_REVIEW",
    "IN_PROCESS":   "IN_PROCESS",
    "MODIFIED":     "IN_PROCESS",
}


@app.post("/api/claims/{claim_id}/feedback")
def submit_feedback(claim_id: str, req: FeedbackRequest):
    """Handler decision — writes feedback and updates claim status."""
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found.")
    save_feedback(claim_id, req.handler_action, req.notes)
    # Update status column on claims table
    new_status = _ACTION_STATUS.get(req.handler_action.upper(), "IN_PROCESS")
    import sqlite3 as _sq
    DB_PATH = os.path.join(os.path.dirname(__file__), "data", "claimwise.db")
    conn = _sq.connect(DB_PATH)
    conn.execute("UPDATE claims SET status = ? WHERE claim_id = ?", (new_status, claim_id))
    conn.commit()
    conn.close()
    return {"status": "ok", "claim_id": claim_id, "action": req.handler_action, "new_status": new_status}


# --- Run with Uvicorn --------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
