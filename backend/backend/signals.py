"""Deterministic signal computation — pure Python, no LLM."""

from models import StructuredClaim


def compute_signals(claim: StructuredClaim) -> dict:
    """Compute rule-based signals from structured claim data.

    Returns dict with:
        missing_documents: list[str] - documents required but not submitted
        sla_risk: str - "CRITICAL" / "URGENT" / "NORMAL"
        amount_flag: bool - True if claim amount > 90% of policy limit
    """
    missing_documents = list(
        set(claim.required_documents) - set(claim.submitted_documents)
    )

    if claim.hours_remaining < 6:
        sla_risk = "CRITICAL"
    elif claim.hours_remaining < 24:
        sla_risk = "URGENT"
    else:
        sla_risk = "NORMAL"

    amount_flag = claim.claim_amount > 0.9 * claim.policy_limit

    return {
        "missing_documents": missing_documents,
        "sla_risk": sla_risk,
        "amount_flag": amount_flag,
    }


if __name__ == "__main__":
    # Standalone test with synthetic claims
    test_cases = [
        StructuredClaim(
            claim_id="TEST-001",
            claim_type="Auto Collision",
            claim_amount=12500.0,
            policy_limit=25000.0,
            incident_date="2024-11-15",
            policy_number="POL-AUTO-55921",
            narrative="Test auto claim",
            submitted_documents=["Claim Form", "Police Report", "Medical Records"],
            required_documents=["Claim Form", "Police Report", "Medical Records", "Witness Statements"],
            sla_hours=48,
            hours_remaining=36,
            previous_claims=1,
        ),
        StructuredClaim(
            claim_id="TEST-002",
            claim_type="Health - Surgical Procedure",
            claim_amount=45000.0,
            policy_limit=50000.0,
            incident_date="2024-12-01",
            policy_number="POL-HEALTH-78234",
            narrative="Test health claim near policy limit",
            submitted_documents=["Claim Form", "Hospital Invoice"],
            required_documents=["Claim Form", "Hospital Invoice", "Surgical Report", "Discharge Summary"],
            sla_hours=72,
            hours_remaining=4,
            previous_claims=0,
        ),
        StructuredClaim(
            claim_id="TEST-003",
            claim_type="Property - Fire",
            claim_amount=185000.0,
            policy_limit=200000.0,
            incident_date="2024-10-28",
            policy_number="POL-PROP-33102",
            narrative="Test property fire claim",
            submitted_documents=["Claim Form", "Fire Department Report"],
            required_documents=["Claim Form", "Fire Department Report", "Fire Marshal Report", "Contractor Estimates", "Contents Inventory", "Photos", "Proof of Temporary Housing"],
            sla_hours=96,
            hours_remaining=5,
            previous_claims=3,
        ),
    ]

    for claim in test_cases:
        signals = compute_signals(claim)
        print(f"\n{claim.claim_id} ({claim.claim_type}):")
        print(f"  Missing docs: {signals['missing_documents']}")
        print(f"  SLA risk: {signals['sla_risk']}")
        print(f"  Amount flag: {signals['amount_flag']}")

    print("\n[OK] signals.py works")
