"""Triage engine — Groq LLM call with current-state-first reasoning + Pydantic validation with retry."""

import json
import os
import re

from dotenv import load_dotenv

# Ensure .env is loaded BEFORE reading GROQ_API_KEY
load_dotenv()

from groq import Groq
from pydantic import ValidationError

from models import StructuredClaim, TriageResult

_MODEL = "qwen/qwen3.6-27b"
_FALLBACK_MODEL = "openai/gpt-oss-120b"
_client = None


def _extract_json_block(text: str) -> str:
    """Robustly extract a JSON object from text containing markdown or reasoning blocks.
    Finds the largest valid balanced brace pair to avoid stray braces."""
    start_indices = [i for i, c in enumerate(text) if c == '{']
    end_indices = [i for i, c in enumerate(text) if c == '}']
    
    for s in start_indices:
        for e in reversed(end_indices):
            if e < s:
                continue
            block = text[s:e+1]
            try:
                parsed = json.loads(block)
                if isinstance(parsed, dict):
                    return block
            except json.JSONDecodeError:
                pass
                
    # Fallback to simple first-to-last
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    if start_idx != -1 and end_idx != -1:
        return text[start_idx:end_idx+1]
    return text


def _call_llm(messages: list, temperature: float, max_tokens: int) -> str:
    """Call Groq API with automatic fallback on failure."""
    client = _get_client()
    try:
        response = client.chat.completions.create(
            model=_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[{__name__}] Primary model {_MODEL} failed: {e}. Retrying with {_FALLBACK_MODEL}...")
        response = client.chat.completions.create(
            model=_FALLBACK_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content.strip()


def _get_client() -> Groq:
    """Lazily initialize Groq client, validating API key on first use."""
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or api_key == "your_groq_api_key_here":
            raise RuntimeError(
                "GROQ_API_KEY not set or still placeholder. "
                "Edit backend/.env with your real Groq API key."
            )
        _client = Groq(api_key=api_key)
    return _client

# === CURRENT-STATE-FIRST SYSTEM PROMPT — do not weaken this ===
_SYSTEM_PROMPT_TEMPLATE = """You are assessing an insurance claim. Base your risk, complexity, criticality,
team assignment, and priority PRIMARILY on the current claim's own data:
its documents, narrative, policy match, and computed urgency signals below.

Retrieved historical cases are provided ONLY to help you (a) suggest a
settlement range and (b) optionally note a comparable precedent. Do NOT let
a historical case override or soften your assessment of what THIS claim's
own data shows. If the current claim shows missing documents, high urgency,
or inconsistency, reflect that regardless of how past similar claims were
resolved.

You must fill current_state_summary based only on the current claim and
signals below, BEFORE considering comparable_cases.

Current claim: {claim_json}
Computed signals: sla_risk={sla_risk}, amount_flag={amount_flag}, missing_documents={missing_documents}
Comparable past cases (settlement reference only, top {k} by similarity): {retrieved_cases}

Respond with JSON only (no markdown fences, no explanations), matching this schema exactly:

{{
  "claim_id": "string",
  "claim_type": "string",
  "complexity": "LOW" | "MEDIUM" | "HIGH",
  "criticality": "NORMAL" | "URGENT" | "CRITICAL",
  "confidence_score": integer 0-100,
  "assigned_team": "Motor Claims" | "Health Claims" | "Property Claims" | "Life Claims" | "Fraud Investigation" | "Senior/Complex Review",
  "team_assignment_reason": "string explaining team assignment",
  "priority_score": integer 0-100 (higher = more urgent),
  "priority_reason": "string explaining priority",
  "risk_score": integer 0-100 (higher = more risk),
  "risk_factors": ["list of identified risk factors"],
  "missing_documents": ["list of missing required documents"],
  "current_state_summary": "summary based ONLY on current claim data and signals — NOT from historical cases",
  "comparable_cases": ["list of comparable case IDs/descriptions from retrieved cases, if any"],
  "settlement_low": number or null (estimated low end of settlement range based on comparable cases),
  "settlement_high": number or null (estimated high end of settlement range based on comparable cases),
  "settlement_justification": "string or null (reasoning for settlement range)",
  "next_best_action": ["list of recommended next steps"],
  "reasoning": "full reasoning chain explaining the triage decision"
}}

IMPORTANT:
- Fill current_state_summary FIRST based only on this claim's data
- risk_factors should reflect THIS claim's issues (missing docs, SLA pressure, amount flags)
- If sla_risk is CRITICAL or URGENT, criticality should reflect that
- If amount_flag is true, note it as a risk factor
- missing_documents should match the computed signals
- assigned_team should match the claim type unless risk/complexity warrants Senior/Complex Review
"""


def run_triage(
    claim: StructuredClaim,
    signals: dict,
    retrieved_cases: list[dict],
    top_k: int = 5,
) -> TriageResult:
    """Run triage assessment via Groq LLM with up to 2 retries on ValidationError."""

    # Build the prompt
    claim_json = claim.model_dump_json(indent=2)
    retrieved_summary = json.dumps(
        [
            {
                "claim_id": c.get("claim_id", "unknown"),
                "text": c.get("text", "")[:200],
                "claim_amount": c.get("claim_amount"),
                "settlement_amount": c.get("settlement_amount"),
                "outcome": c.get("outcome"),
                "similarity_score": c.get("similarity_score"),
            }
            for c in retrieved_cases[:top_k]
        ],
        indent=2,
    )

    system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
        claim_json=claim_json,
        sla_risk=signals["sla_risk"],
        amount_flag=signals["amount_flag"],
        missing_documents=json.dumps(signals["missing_documents"]),
        k=top_k,
        retrieved_cases=retrieved_summary,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Assess this claim and return the triage result as JSON."},
    ]

    max_retries = 2
    last_error = None

    for attempt in range(1 + max_retries):
        raw_json = _call_llm(messages, temperature=0.1, max_tokens=3000)
        raw_json = _extract_json_block(raw_json)

        try:
            result = TriageResult.model_validate_json(raw_json)
            return result
        except ValidationError as e:
            last_error = e
            print(f"[triage_engine] Attempt {attempt + 1} validation failed: {e}")

            if attempt < max_retries:
                # Append error context for retry
                messages.append({"role": "assistant", "content": raw_json})
                messages.append({
                    "role": "user",
                    "content": (
                        f"The previous response failed Pydantic validation:\n{e}\n\n"
                        "Fix the specific fields mentioned above. Return valid JSON only, "
                        "no markdown fences. Ensure all required fields are present and "
                        "values match the allowed types/ranges."
                    ),
                })

    raise RuntimeError(
        f"Triage failed after {max_retries + 1} attempts. Last error: {last_error}"
    )


if __name__ == "__main__":
    # Standalone test — requires GROQ_API_KEY set in .env
    from signals import compute_signals

    test_claim = StructuredClaim(
        claim_id="TEST-TRIAGE-001",
        claim_type="Auto Collision",
        claim_amount=12500.0,
        policy_limit=25000.0,
        incident_date="2024-11-15",
        policy_number="POL-AUTO-55921",
        narrative="Rear-end collision at traffic light. Minor bumper damage and whiplash.",
        submitted_documents=["Claim Form", "Police Report", "Medical Records"],
        required_documents=["Claim Form", "Police Report", "Medical Records", "Witness Statements"],
        sla_hours=48,
        hours_remaining=36,
        previous_claims=1,
    )

    sigs = compute_signals(test_claim)
    print(f"Signals: {sigs}")

    # Use empty retrieved cases for standalone test (retrieval may not be loaded)
    mock_cases = [
        {
            "claim_id": "HC001",
            "text": "Auto collision rear-end. Amount: 8500. Outcome: Approved. Settlement: 7200.",
            "claim_amount": 8500,
            "settlement_amount": 7200,
            "outcome": "Approved",
            "similarity_score": 0.85,
        }
    ]

    print("Calling Groq for triage...")
    result = run_triage(test_claim, sigs, mock_cases)
    print(f"\nTriage result:\n{result.model_dump_json(indent=2)}")
    print("\n[OK] triage_engine.py works")
