"""
batch_process_all.py
--------------------
Runs every claim in data/incoming/incoming_claims.json through the full
AI triage pipeline and persists results to data/claimwise.db.

- Skips claims already in the DB.
- Reads actual PDFs from data/incoming/<claim_id>/ (falls back to narrative
  text if no PDFs exist for that claim ID).
- Waits DELAY_BETWEEN_CLAIMS seconds between API calls to stay inside Groq
  rate limits (8K TPM on-demand tier).
- Retries up to MAX_RETRIES times on transient errors with exponential backoff.
"""

import json
import os
import sqlite3
import time
import traceback

from models import StructuredClaim
from signals import compute_signals
from retrieval import retrieve_similar_claims
from triage_engine import run_triage
from safety_override import apply_safety_override
from db import save_claim, save_triage_result, init_db
from pdf_extract import extract_text

INCOMING_JSON         = os.path.join("data", "incoming", "incoming_claims.json")
INCOMING_DIR          = os.path.join("data", "incoming")
DB_PATH               = os.path.join("data", "claimwise.db")
DELAY_BETWEEN_CLAIMS  = 65
MAX_RETRIES           = 3


def already_processed(claim_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT 1 FROM claims WHERE claim_id = ?", (claim_id,))
    found = c.fetchone() is not None
    conn.close()
    return found


def extract_pdfs_for_claim(claim_id):
    claim_dir = os.path.join(INCOMING_DIR, claim_id)
    if not os.path.isdir(claim_dir):
        return "", {}
    texts = []
    doc_urls = {}
    for fname in sorted(os.listdir(claim_dir)):
        if fname.lower().endswith(".pdf"):
            fpath = os.path.join(claim_dir, fname)
            try:
                text = extract_text(fpath)
                texts.append("--- " + fname + " ---\n" + text)
                doc_name = fname.replace(".pdf", "").replace("_", " ").title()
                doc_urls[doc_name] = "file:///" + fpath.replace(os.sep, "/")
            except Exception as e:
                print("  [warn] Could not extract " + fname + ": " + str(e))
    return "\n\n".join(texts), doc_urls


def process_claim(item):
    claim_id = item["claim_id"]
    raw_text, pdf_doc_urls = extract_pdfs_for_claim(claim_id)
    if not raw_text.strip():
        print("  [info] No PDFs for " + claim_id + " -- using narrative from JSON.")
        raw_text = item.get("narrative", "")

    submitted_docs = item.get("submitted_documents", [])

    sc = StructuredClaim(
        claim_id            = claim_id,
        claim_type          = item.get("claim_type", "General"),
        claim_amount        = float(item.get("claim_amount", 0)),
        policy_limit        = float(item.get("claim_amount", 0)) * 2,
        incident_date       = item.get("incident_date", "2024-01-01"),
        policy_number       = item.get("policy_id", "Unknown"),
        narrative           = item.get("narrative", raw_text[:500]),
        submitted_documents = submitted_docs,
        required_documents  = ["claim_form", "policy"],
        sla_hours           = item.get("sla_hours", 48),
        hours_remaining     = item.get("hours_remaining", 48),
        previous_claims     = 0,
        document_urls       = pdf_doc_urls,
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print("  [attempt " + str(attempt) + "] Computing signals...")
            sigs = compute_signals(sc)
            print("  [attempt " + str(attempt) + "] Retrieving similar claims...")
            retrieved = retrieve_similar_claims(sc.narrative, top_k=3)
            print("  [attempt " + str(attempt) + "] Running triage (LLM call)...")
            triage_result = run_triage(sc, sigs, retrieved)
            triage_result = apply_safety_override(triage_result)
            save_claim(sc.model_dump(), raw_text=raw_text)
            save_triage_result(triage_result.model_dump())
            print("  OK Saved " + claim_id + " -> team=" + str(triage_result.assigned_team) +
                  "  priority=" + str(triage_result.priority_score) +
                  "  criticality=" + str(triage_result.criticality))
            return True
        except Exception as e:
            msg = str(e)
            if "rate_limit" in msg.lower() or "429" in msg:
                wait = 60 * attempt
                print("  [rate-limit] Waiting " + str(wait) + "s before retry " + str(attempt) + "/" + str(MAX_RETRIES))
                time.sleep(wait)
            else:
                print("  [error] Attempt " + str(attempt) + " failed: " + msg)
                if attempt == MAX_RETRIES:
                    traceback.print_exc()
                else:
                    time.sleep(10)
    return False


def main():
    print("=" * 60)
    print("ClaimWise AI -- Batch Pipeline Processor")
    print("=" * 60)

    init_db()

    with open(INCOMING_JSON, "r") as f:
        incoming = json.load(f)

    total   = len(incoming)
    done    = 0
    skipped = 0
    failed  = []

    print("\nFound " + str(total) + " claims in incoming_claims.json\n")

    for i, item in enumerate(incoming):
        claim_id = item["claim_id"]
        print("\n[" + str(i+1) + "/" + str(total) + "] " + claim_id +
              "  (" + item.get("claim_type","?") + "  amount=" + str(item.get("claim_amount",0)) + ")")

        if already_processed(claim_id):
            print("  Skipping -- already in DB.")
            skipped += 1
            continue

        success = process_claim(item)
        if success:
            done += 1
        else:
            failed.append(claim_id)

        if i < total - 1:
            next_unprocessed = sum(1 for j in incoming[i+1:] if not already_processed(j["claim_id"]))
            if next_unprocessed > 0:
                print("  Waiting " + str(DELAY_BETWEEN_CLAIMS) + "s before next claim (Groq TPM guard)...")
                time.sleep(DELAY_BETWEEN_CLAIMS)

    print("\n" + "=" * 60)
    print("BATCH COMPLETE")
    print("=" * 60)
    print("  Processed : " + str(done))
    print("  Skipped   : " + str(skipped) + " (already in DB)")
    print("  Failed    : " + str(len(failed)))
    if failed:
        print("  Failed IDs: " + ", ".join(failed))

    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT c.claim_id, t.assigned_team, t.criticality, t.priority_score
        FROM claims c
        LEFT JOIN triage_results t ON c.claim_id = t.claim_id
        ORDER BY t.priority_score DESC
    """).fetchall()
    conn.close()

    print("\n" + "-" * 64)
    print(f"{'claim_id':<12} {'team':<28} {'criticality':<12} {'priority':>8}")
    print("-" * 64)
    for r in rows:
        print(f"{str(r[0]):<12} {str(r[1]):<28} {str(r[2]):<12} {str(r[3]):>8}")
    print("-" * 64)


if __name__ == "__main__":
    main()
