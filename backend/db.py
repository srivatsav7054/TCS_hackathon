"""SQLite database setup + CRUD helpers."""

import sqlite3
import json
import os
from datetime import datetime, timezone


DB_PATH = os.path.join(os.path.dirname(__file__), "data", "claimwise.db")


def _get_conn() -> sqlite3.Connection:
    """Get a connection with row factory for dict-like access."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = _get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS claims (
            claim_id TEXT PRIMARY KEY,
            claim_type TEXT,
            claim_amount REAL,
            policy_limit REAL,
            incident_date TEXT,
            policy_number TEXT,
            narrative TEXT,
            submitted_documents TEXT,
            required_documents TEXT,
            sla_hours INTEGER,
            hours_remaining INTEGER,
            previous_claims INTEGER DEFAULT 0,
            raw_text TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS triage_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id TEXT NOT NULL,
            claim_type TEXT,
            complexity TEXT,
            criticality TEXT,
            confidence_score INTEGER,
            assigned_team TEXT,
            team_assignment_reason TEXT,
            priority_score INTEGER,
            priority_reason TEXT,
            risk_score INTEGER,
            risk_factors TEXT,
            missing_documents TEXT,
            current_state_summary TEXT,
            comparable_cases TEXT,
            settlement_low REAL,
            settlement_high REAL,
            settlement_justification TEXT,
            next_best_action TEXT,
            reasoning TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (claim_id) REFERENCES claims(claim_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id TEXT NOT NULL,
            handler_action TEXT NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (claim_id) REFERENCES claims(claim_id)
        )
    """)

    conn.commit()
    conn.close()


def save_claim(claim_data: dict, raw_text: str = ""):
    """Insert or replace a claim record."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT OR REPLACE INTO claims
        (claim_id, claim_type, claim_amount, policy_limit, incident_date,
         policy_number, narrative, submitted_documents, required_documents,
         sla_hours, hours_remaining, previous_claims, raw_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            claim_data["claim_id"],
            claim_data["claim_type"],
            claim_data["claim_amount"],
            claim_data["policy_limit"],
            claim_data["incident_date"],
            claim_data["policy_number"],
            claim_data["narrative"],
            json.dumps(claim_data["submitted_documents"]),
            json.dumps(claim_data["required_documents"]),
            claim_data["sla_hours"],
            claim_data["hours_remaining"],
            claim_data.get("previous_claims", 0),
            raw_text,
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def save_triage_result(result_data: dict):
    """Insert a triage result record."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO triage_results
        (claim_id, claim_type, complexity, criticality, confidence_score,
         assigned_team, team_assignment_reason, priority_score, priority_reason,
         risk_score, risk_factors, missing_documents, current_state_summary,
         comparable_cases, settlement_low, settlement_high, settlement_justification,
         next_best_action, reasoning, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            result_data["claim_id"],
            result_data["claim_type"],
            result_data["complexity"],
            result_data["criticality"],
            result_data["confidence_score"],
            result_data["assigned_team"],
            result_data["team_assignment_reason"],
            result_data["priority_score"],
            result_data["priority_reason"],
            result_data["risk_score"],
            json.dumps(result_data.get("risk_factors", [])),
            json.dumps(result_data.get("missing_documents", [])),
            result_data["current_state_summary"],
            json.dumps(result_data.get("comparable_cases", [])),
            result_data.get("settlement_low"),
            result_data.get("settlement_high"),
            result_data.get("settlement_justification"),
            json.dumps(result_data.get("next_best_action", [])),
            result_data["reasoning"],
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def get_all_claims() -> list[dict]:
    """Get all claims with their latest triage results, sorted by priority_score desc."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, t.complexity, t.criticality, t.confidence_score,
               t.assigned_team, t.team_assignment_reason,
               t.priority_score, t.priority_reason, t.risk_score,
               t.risk_factors, t.missing_documents, t.current_state_summary,
               t.comparable_cases, t.settlement_low, t.settlement_high,
               t.settlement_justification, t.next_best_action, t.reasoning
        FROM claims c
        LEFT JOIN triage_results t ON c.claim_id = t.claim_id
        ORDER BY t.priority_score DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        d = dict(row)
        # Parse JSON fields back to lists
        for field in ["submitted_documents", "required_documents", "risk_factors",
                       "missing_documents", "comparable_cases", "next_best_action"]:
            if d.get(field) and isinstance(d[field], str):
                try:
                    d[field] = json.loads(d[field])
                except json.JSONDecodeError:
                    pass
        results.append(d)
    return results


def get_claim(claim_id: str) -> dict | None:
    """Get a single claim with its triage result."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, t.complexity, t.criticality, t.confidence_score,
               t.assigned_team, t.team_assignment_reason,
               t.priority_score, t.priority_reason, t.risk_score,
               t.risk_factors, t.missing_documents, t.current_state_summary,
               t.comparable_cases, t.settlement_low, t.settlement_high,
               t.settlement_justification, t.next_best_action, t.reasoning
        FROM claims c
        LEFT JOIN triage_results t ON c.claim_id = t.claim_id
        WHERE c.claim_id = ?
    """, (claim_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    d = dict(row)
    for field in ["submitted_documents", "required_documents", "risk_factors",
                   "missing_documents", "comparable_cases", "next_best_action"]:
        if d.get(field) and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except json.JSONDecodeError:
                pass
    return d


_COMPLEXITY_MAP = {"LOW": 25, "MEDIUM": 60, "HIGH": 90}

_FRAUD_KEYWORDS = [
    "fraud", "suspicious", "misrepresent", "falsif", "inflated",
    "fabricat", "discrepan", "inconsisten", "offshore", "cryptocurrency",
]


def get_claim_summary(claim_id: str) -> dict | None:
    """Return a lightweight summary dict for the AI Summary Panel.

    Reads cached triage data — no LLM call, sub-50ms response.
    """
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.claim_id, c.claim_type, c.claim_amount, c.incident_date,
               c.policy_number, c.previous_claims,
               t.priority_score, t.risk_score, t.complexity, t.confidence_score,
               t.assigned_team, t.criticality, t.risk_factors,
               t.team_assignment_reason, t.priority_reason, t.reasoning,
               c.submitted_documents, c.required_documents
        FROM claims c
        LEFT JOIN triage_results t ON c.claim_id = t.claim_id
        WHERE c.claim_id = ?
    """, (claim_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    d = dict(row)

    # Parse JSON string fields
    risk_factors = []
    if d.get("risk_factors") and isinstance(d["risk_factors"], str):
        try:
            risk_factors = json.loads(d["risk_factors"])
        except json.JSONDecodeError:
            pass

    submitted = []
    required = []
    if d.get("submitted_documents") and isinstance(d["submitted_documents"], str):
        try:
            submitted = json.loads(d["submitted_documents"])
        except json.JSONDecodeError:
            pass
    if d.get("required_documents") and isinstance(d["required_documents"], str):
        try:
            required = json.loads(d["required_documents"])
        except json.JSONDecodeError:
            pass

    # Derive complexity_score (0-100) from enum
    complexity_label = d.get("complexity", "MEDIUM") or "MEDIUM"
    complexity_score = _COMPLEXITY_MAP.get(complexity_label.upper(), 60)

    # Derive completion_percentage from documents
    total_required = len(required) if required else 1
    docs_submitted = len([doc for doc in submitted if doc in required]) if submitted and required else 0
    completion_percentage = int((docs_submitted / total_required) * 100) if total_required > 0 else 0

    # Derive fraud_flag and fraud_indicators from risk_factors
    fraud_indicators = []
    for rf in risk_factors:
        rf_lower = rf.lower()
        if any(kw in rf_lower for kw in _FRAUD_KEYWORDS):
            fraud_indicators.append(rf)
    fraud_flag = len(fraud_indicators) > 0

    return {
        "claim_id": d["claim_id"],
        "claim_type": d.get("claim_type"),
        "claim_amount": d.get("claim_amount"),
        "priority_score": d.get("priority_score", 0),
        "risk_score": d.get("risk_score", 0),
        "complexity_score": complexity_score,
        "confidence_score": d.get("confidence_score", 0),
        "completion_percentage": completion_percentage,
        "fraud_flag": fraud_flag,
        "risk_factors": risk_factors,
        "fraud_indicators": fraud_indicators,
        "assigned_team": d.get("assigned_team"),
        "criticality": d.get("criticality"),
        "incident_date": d.get("incident_date"),
        "policy_number": d.get("policy_number"),
        "previous_claims": d.get("previous_claims", 0),
        "team_assignment_reason": d.get("team_assignment_reason", ""),
        "priority_reason": d.get("priority_reason", ""),
        "reasoning": d.get("reasoning", ""),
    }


def save_feedback(claim_id: str, handler_action: str, notes: str = ""):
    """Save handler feedback for a claim."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO feedback (claim_id, handler_action, notes, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (claim_id, handler_action, notes, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()


def get_feedback(claim_id: str) -> list[dict]:
    """Get all feedback entries for a claim."""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM feedback WHERE claim_id = ? ORDER BY created_at DESC",
        (claim_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


if __name__ == "__main__":
    import os

    # Clean up any existing test DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    print("Initializing database...")
    init_db()

    # Test save_claim
    test_claim = {
        "claim_id": "TEST-DB-001",
        "claim_type": "Auto Collision",
        "claim_amount": 12500.0,
        "policy_limit": 25000.0,
        "incident_date": "2024-11-15",
        "policy_number": "POL-AUTO-55921",
        "narrative": "Test claim narrative",
        "submitted_documents": ["Claim Form", "Police Report"],
        "required_documents": ["Claim Form", "Police Report", "Witness Statements"],
        "sla_hours": 48,
        "hours_remaining": 36,
        "previous_claims": 1,
    }
    save_claim(test_claim, raw_text="Raw PDF text here")
    print("Saved claim: TEST-DB-001")

    # Test save_triage_result
    test_result = {
        "claim_id": "TEST-DB-001",
        "claim_type": "Auto Collision",
        "complexity": "MEDIUM",
        "criticality": "NORMAL",
        "confidence_score": 80,
        "assigned_team": "Motor Claims",
        "team_assignment_reason": "Auto collision -> Motor",
        "priority_score": 65,
        "priority_reason": "Moderate priority",
        "risk_score": 45,
        "risk_factors": ["Missing witness statements"],
        "missing_documents": ["Witness Statements"],
        "current_state_summary": "Auto collision with minor injuries",
        "comparable_cases": ["HC001"],
        "settlement_low": 10000.0,
        "settlement_high": 13000.0,
        "settlement_justification": "Based on similar auto claims",
        "next_best_action": ["Request witness statements", "Schedule adjuster review"],
        "reasoning": "Standard auto claim with missing docs",
    }
    save_triage_result(test_result)
    print("Saved triage result for TEST-DB-001")

    # Test get_all_claims
    claims = get_all_claims()
    print(f"\nAll claims ({len(claims)}):")
    for c in claims:
        print(f"  {c['claim_id']}: priority={c.get('priority_score')}, team={c.get('assigned_team')}")

    # Test get_claim
    detail = get_claim("TEST-DB-001")
    print(f"\nClaim detail: {detail['claim_id']}, missing_docs={detail.get('missing_documents')}")

    # Test feedback
    save_feedback("TEST-DB-001", "APPROVED", "Looks good, proceeding")
    fb = get_feedback("TEST-DB-001")
    print(f"Feedback: {fb}")

    # Clean up test DB
    os.remove(DB_PATH)
    print("\n[OK] db.py works")
