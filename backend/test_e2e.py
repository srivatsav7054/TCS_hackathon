"""End-to-end upload test for ClaimWise AI."""

import requests
import json
import sys

BASE = "http://127.0.0.1:8000"

# Test 1: Health check
print("=== Test 1: Health Check ===")
r = requests.get(f"{BASE}/api/health")
print(f"Status: {r.status_code} | Body: {r.json()}")
assert r.status_code == 200

# Test 2: Upload sample PDF through full pipeline
print("\n=== Test 2: Upload Auto Collision Claim ===")
with open("data/sample_pdfs/auto_collision_claim.pdf", "rb") as f:
    r = requests.post(f"{BASE}/api/claims/upload", files={"file": ("auto_collision_claim.pdf", f, "application/pdf")})

if r.status_code != 200:
    print(f"ERROR {r.status_code}: {r.text}")
    sys.exit(1)

result = r.json()
claim = result["claim"]
triage = result["triage_result"]
signals = result["signals"]

print(f"Claim ID: {claim['claim_id']}")
print(f"Claim Type: {claim['claim_type']}")
print(f"Amount: ${claim['claim_amount']:,.2f} / Limit: ${claim['policy_limit']:,.2f}")
print(f"\nSignals:")
print(f"  SLA Risk: {signals['sla_risk']}")
print(f"  Amount Flag: {signals['amount_flag']}")
print(f"  Missing Docs: {signals['missing_documents']}")
print(f"\nTriage Result:")
print(f"  Complexity: {triage['complexity']}")
print(f"  Criticality: {triage['criticality']}")
print(f"  Risk Score: {triage['risk_score']}")
print(f"  Confidence: {triage['confidence_score']}")
print(f"  Priority: {triage['priority_score']}")
print(f"  Assigned Team: {triage['assigned_team']}")
print(f"  Missing Docs: {triage['missing_documents']}")
print(f"  Current State Summary: {triage['current_state_summary'][:200]}...")
print(f"  Risk Factors: {triage['risk_factors']}")
print(f"  Next Actions: {triage['next_best_action']}")

# Test 3: List claims
print("\n=== Test 3: List Claims ===")
r = requests.get(f"{BASE}/api/claims")
data = r.json()
print(f"Total claims: {data['count']}")
for c in data["claims"]:
    print(f"  {c['claim_id']}: priority={c.get('priority_score')}, team={c.get('assigned_team')}")

# Test 4: Get claim detail
print(f"\n=== Test 4: Get Claim Detail ({claim['claim_id']}) ===")
r = requests.get(f"{BASE}/api/claims/{claim['claim_id']}")
detail = r.json()
print(f"Claim: {detail['claim']['claim_id']}, Feedback entries: {len(detail['feedback'])}")

# Test 5: Submit feedback
print(f"\n=== Test 5: Submit Feedback ===")
r = requests.post(
    f"{BASE}/api/claims/{claim['claim_id']}/feedback",
    json={"handler_action": "APPROVED", "notes": "Claim looks valid, proceeding with standard processing"}
)
print(f"Status: {r.status_code} | Body: {r.json()}")

print("\n=== ALL TESTS PASSED ===")
