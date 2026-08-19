"""Deterministic safety override — post-processing step after LLM triage."""

from models import TriageResult, Team


def apply_safety_override(result: TriageResult) -> TriageResult:
    """Force senior review if risk/criticality/confidence thresholds are breached.

    Conditions (any one triggers override):
        - risk_score >= 90
        - criticality == CRITICAL
        - confidence_score < 50
    """
    if (
        result.risk_score >= 90
        or result.criticality.value == "CRITICAL"
        or result.confidence_score < 50
    ):
        result.assigned_team = Team.senior
        result.team_assignment_reason += (
            " [Safety override: high risk / critical / low-confidence -> senior review]"
        )
    return result


if __name__ == "__main__":
    # Standalone test with various edge cases
    from models import Complexity, Criticality

    base_kwargs = dict(
        claim_id="TEST",
        claim_type="Auto",
        complexity=Complexity.medium,
        confidence_score=75,
        assigned_team=Team.motor,
        team_assignment_reason="Auto claim -> Motor Claims",
        priority_score=60,
        priority_reason="Moderate priority",
        risk_score=50,
        risk_factors=[],
        missing_documents=[],
        current_state_summary="Test claim",
        next_best_action=["Review"],
        reasoning="Test",
    )

    # Case 1: Normal — no override
    r1 = apply_safety_override(TriageResult(criticality=Criticality.normal, **base_kwargs))
    assert r1.assigned_team == Team.motor, f"FAIL: expected Motor, got {r1.assigned_team}"
    print(f"Case 1 (normal): team={r1.assigned_team.value} -- OK")

    # Case 2: risk_score >= 90 — should override
    kwargs2 = {**base_kwargs, "risk_score": 92}
    r2 = apply_safety_override(
        TriageResult(criticality=Criticality.normal, **kwargs2)
    )
    assert r2.assigned_team == Team.senior, f"FAIL: expected Senior, got {r2.assigned_team}"
    print(f"Case 2 (high risk): team={r2.assigned_team.value} -- OK")

    # Case 3: criticality == CRITICAL — should override
    r3 = apply_safety_override(TriageResult(criticality=Criticality.critical, **base_kwargs))
    assert r3.assigned_team == Team.senior, f"FAIL: expected Senior, got {r3.assigned_team}"
    print(f"Case 3 (critical): team={r3.assigned_team.value} -- OK")

    # Case 4: confidence_score < 50 — should override
    kwargs4 = {**base_kwargs, "confidence_score": 35}
    r4 = apply_safety_override(
        TriageResult(criticality=Criticality.normal, **kwargs4)
    )
    assert r4.assigned_team == Team.senior, f"FAIL: expected Senior, got {r4.assigned_team}"
    print(f"Case 4 (low confidence): team={r4.assigned_team.value} -- OK")

    print("\n[OK] safety_override.py works")
