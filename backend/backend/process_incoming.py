import json
import sqlite3
from models import StructuredClaim
from signals import compute_signals
from retrieval import retrieve_similar_claims
from triage_engine import run_triage
from safety_override import apply_safety_override
from db import save_claim, save_triage_result, get_all_claims

def process():
    print("Loading incoming claims...")
    with open('data/incoming/incoming_claims.json', 'r') as f:
        incoming = json.load(f)

    for item in incoming[:1]:
        claim_id = item['claim_id']
        print(f"Processing {claim_id}...")
        
        # Check if already processed
        conn = sqlite3.connect('data/claimwise.db')
        c = conn.cursor()
        c.execute("SELECT 1 FROM claims WHERE claim_id = ?", (claim_id,))
        if c.fetchone():
            print(f"Skipping {claim_id} (already in DB)")
            conn.close()
            continue
        conn.close()

        sc = StructuredClaim(
            claim_id=claim_id,
            claim_type=item.get('claim_type', 'General'),
            claim_amount=item.get('claim_amount', 0),
            policy_limit=item.get('claim_amount', 0) * 2, # Mock policy limit
            incident_date=item.get('incident_date', '2024-01-01'),
            policy_number=item.get('policy_id', 'Unknown'),
            narrative=item.get('narrative', ''),
            submitted_documents=item.get('submitted_documents', []),
            required_documents=['claim_form', 'policy'],
            sla_hours=item.get('sla_hours', 48),
            hours_remaining=item.get('hours_remaining', 48),
            previous_claims=0,
            document_urls={}
        )
        
        sigs = compute_signals(sc)
        retrieved = retrieve_similar_claims(sc.narrative, top_k=3)
        triage_result = run_triage(sc, sigs, retrieved)
        triage_result = apply_safety_override(triage_result)
        
        save_claim(sc.model_dump(), raw_text=item.get('narrative', ''))
        save_triage_result(triage_result.model_dump())
        print(f"Saved {claim_id}.")

    print("\nProcessing complete. Removing dummy data...")
    conn = sqlite3.connect('data/claimwise.db')
    c = conn.cursor()
    c.execute("DELETE FROM claims WHERE claim_id LIKE 'CLM-2024-%'")
    c.execute("DELETE FROM triage_results WHERE claim_id LIKE 'CLM-2024-%'")
    print(f"Deleted {c.rowcount} dummy claims.")
    conn.commit()
    conn.close()
    
    print("Done! Database now contains only real processed claims.")

if __name__ == '__main__':
    process()
