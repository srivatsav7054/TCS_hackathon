"""Test edge cases for ClaimWise AI backend pipeline."""

import json
from llm_extract import extract_structured_claim
from signals import compute_signals
from retrieval import retrieve_similar_claims
from triage_engine import run_triage
from safety_override import apply_safety_override

def run_pipeline(name: str, raw_text: str):
    print(f"\n======================================")
    print(f"RUNNING EDGE CASE: {name}")
    print(f"======================================")
    
    # 1. LLM Extract
    print("\n--- LLM Extract ---")
    claim = extract_structured_claim(raw_text)
    print(f"Extracted Claim Type: {claim.claim_type}")
    print(f"Amount: ${claim.claim_amount} / Limit: ${claim.policy_limit}")
    
    # 2. Signals
    signals = compute_signals(claim)
    
    # 3. Retrieval
    query_text = f"{claim.claim_type} {claim.narrative}"
    retrieved = retrieve_similar_claims(query_text, top_k=3)
    
    # 4. Triage
    print("\n--- Triage Engine ---")
    triage_result = run_triage(claim, signals, retrieved)
    
    # 5. Safety Override
    triage_result = apply_safety_override(triage_result)
    
    print("\n--- FINAL TRIAGE RESULT JSON ---")
    print(triage_result.model_dump_json(indent=2))
    return triage_result


claim_1_safety_override = """
CLAIM ID: EDGE-001
POLICY NUMBER: POL-SUSPICIOUS
INCIDENT DATE: 2024-11-20
CLAIM TYPE: Auto Collision
CLAIM AMOUNT: $200,000.00
POLICY LIMIT: $50,000.00

NARRATIVE:
The insured vehicle, a 1999 Honda Civic, was allegedly involved in a high-speed collision with 4 luxury vehicles, all of which were completely totaled. The insured claims they were driving at 15 mph but somehow caused catastrophic damage. There are no witnesses, no police report, and the insured is demanding an immediate payout in cryptocurrency to an offshore account. The incident happened at 3 AM in an abandoned parking lot with no cameras.

SUBMITTED DOCUMENTS:
- Handwritten note on napkin

REQUIRED DOCUMENTS:
- Police Report
- Repair Estimates
- Medical Records
- Proof of Ownership
"""

claim_2_missing_docs = """
CLAIM ID: EDGE-002
POLICY NUMBER: POL-MISSING
INCIDENT DATE: 2024-10-01
CLAIM TYPE: Property Damage
CLAIM AMOUNT: $5,000.00
POLICY LIMIT: $25,000.00

NARRATIVE:
A small fire broke out in the kitchen due to a faulty toaster. Damage is contained to the countertop and the toaster itself. The fire department was called and quickly extinguished it. Nobody was hurt. 

SUBMITTED DOCUMENTS:
- Claim Form

REQUIRED DOCUMENTS:
- Fire Department Report
- Repair Estimates
- Photos of Damage
- Original Purchase Receipt for Toaster
"""

claim_3_irrelevant_retrieval = """
CLAIM ID: EDGE-003
POLICY NUMBER: POL-WEIRD
INCIDENT DATE: 2024-05-15
CLAIM TYPE: Pet Insurance
CLAIM AMOUNT: $1,200.00
POLICY LIMIT: $5,000.00

NARRATIVE:
My pet iguana "Godzilla" accidentally swallowed a small diamond ring. We had to take him to the exotic vet for emergency surgery to remove it. He is recovering well. I am claiming the vet bill. 

SUBMITTED DOCUMENTS:
- Vet Bill
- X-Ray showing ring
- Claim Form

REQUIRED DOCUMENTS:
- Vet Bill
- Medical Records
- Claim Form
"""

if __name__ == "__main__":
    print("Testing Model Reliability & Edge Cases...")
    
    try:
        res1 = run_pipeline("CASE 1: Safety Override Trigger (High Risk / Critical)", claim_1_safety_override)
        res2 = run_pipeline("CASE 2: Missing Documents", claim_2_missing_docs)
        res3 = run_pipeline("CASE 3: Irrelevant Historical Context (Pet Iguana)", claim_3_irrelevant_retrieval)
    except Exception as e:
        print(f"\n[ERROR] Pipeline failed: {e}")
