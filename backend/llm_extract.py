"""LLM-based structured claim extraction via Groq API."""

import json
import os
import re

from dotenv import load_dotenv

# Ensure .env is loaded BEFORE reading GROQ_API_KEY
load_dotenv()

from groq import Groq
from models import StructuredClaim

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
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[{__name__}] Primary model {_MODEL} failed: {e}. Retrying with {_FALLBACK_MODEL}...")
        response = client.chat.completions.create(
            model=_FALLBACK_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
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

_SYSTEM_PROMPT = """You are a structured data extractor for insurance claims.
Given raw text from a claim document, extract the following fields into a JSON object.
Return ONLY valid JSON, no markdown fences, no explanations.

Required JSON schema:
{
  "claim_id": "string",
  "claim_type": "string",
  "claim_amount": number,
  "policy_limit": number,
  "incident_date": "YYYY-MM-DD",
  "policy_number": "string",
  "narrative": "string (the full narrative/description of the incident)",
  "submitted_documents": ["list of document names submitted"],
  "required_documents": ["list of document names required"],
  "sla_hours": integer (total SLA hours),
  "hours_remaining": integer (hours remaining in SLA),
  "previous_claims": integer (number of previous claims, default 0)
}

Important:
- Extract claim_amount and policy_limit as plain numbers without currency symbols
- If a field is not found, use reasonable defaults (0 for numbers, empty string, empty list)
- For dates, use YYYY-MM-DD format
- Return ONLY the JSON object, nothing else
"""


def extract_structured_claim(raw_text: str) -> StructuredClaim:
    """Extract structured claim data from raw PDF text using Groq LLM.

    Makes one attempt, retries once on parse failure with stricter instructions.
    """
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": f"Extract structured data from this claim document:\n\n{raw_text}"},
    ]

    raw_json = _call_llm(messages, temperature=0.1, max_tokens=2000)
    raw_json = _extract_json_block(raw_json)

    try:
        return StructuredClaim.model_validate_json(raw_json)
    except Exception as first_err:
        print(f"[llm_extract] First parse failed: {first_err}")
        print(f"[llm_extract] Raw response: {raw_json[:500]}")

        # Retry with stricter instruction
        messages.append({"role": "assistant", "content": raw_json})
        messages.append({
            "role": "user",
            "content": (
                f"The previous response failed validation: {first_err}\n"
                "Return valid JSON only, no markdown fences, no extra text. "
                "Make sure all required fields are present and correctly typed."
            ),
        })

        raw_json = _call_llm(messages, temperature=0.0, max_tokens=2000)
        raw_json = _extract_json_block(raw_json)

        return StructuredClaim.model_validate_json(raw_json)


if __name__ == "__main__":
    from pdf_extract import extract_text

    test_pdf = "data/sample_pdfs/auto_collision_claim.pdf"
    print(f"Extracting text from {test_pdf}...")
    raw = extract_text(test_pdf)
    print(f"Raw text length: {len(raw)} chars")
    print("Calling Groq for structured extraction...")
    claim = extract_structured_claim(raw)
    print(f"\nStructured claim:\n{claim.model_dump_json(indent=2)}")
    print("\n[OK] llm_extract.py works")
