import { MOCK_CLAIMS } from "../data/mockClaims";

const BASE_URL = "http://localhost:8000";

// ─── MOCK MODE ─────────────────────────────────────────────────────────────
// Set to false to use the real FastAPI backend.
// Affects: uploadClaim() and fetchSettlements() only.
// fetchClaims() / fetchClaim() already fall back automatically on network error.
export const MOCK_MODE = true;
// ───────────────────────────────────────────────────────────────────────────

async function safeFetch(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn(`[ClaimWise AI] API unavailable (${url}): ${err.message}. Falling back to mock data.`);
    return null;
  }
}

/**
 * Fetch all claims, optionally filtered by team.
 * @param {string|null} team - Team name or null for all
 */
export async function fetchClaims(team = null) {
  const url = team
    ? `${BASE_URL}/api/claims?team=${encodeURIComponent(team)}`
    : `${BASE_URL}/api/claims`;

  const data = await safeFetch(url);

  if (data) {
    const claimsArray = data.claims || [];
    return team ? claimsArray.filter((c) => c.assigned_team === team) : claimsArray;
  }

  // Mock fallback
  return team ? MOCK_CLAIMS.filter((c) => c.assigned_team === team) : MOCK_CLAIMS;
}

/**
 * Fetch a single claim by ID.
 * @param {string} claimId
 */
export async function fetchClaim(claimId) {
  const data = await safeFetch(`${BASE_URL}/api/claims/${claimId}`);
  if (data) {
    return { ...data.claim, ...data.triage_result, feedback: data.feedback };
  }

  const found = MOCK_CLAIMS.find((c) => c.claim_id === claimId);
  if (!found) throw new Error(`Claim ${claimId} not found`);
  return found;
}

/**
 * POST /claims/upload — multipart/form-data batch of PDFs for one claim.
 * Backend extracts, triages, and returns a TriageResult.
 *
 * MOCK_MODE: simulates 2.5s extraction + LLM call, returns a realistic
 * TriageResult. Set MOCK_MODE = false once the real endpoint is live.
 *
 * @param {FormData} formData  All PDFs attached under the key "files"
 * @returns {Promise<TriageResult>}
 */
export async function uploadClaim(formData) {
  if (MOCK_MODE) {
    // Simulate extraction + triage latency
    await new Promise((r) => setTimeout(r, 2500));

    // Extract files from FormData and create Object URLs for them
    const files = formData.getAll("files");
    const document_urls = {};
    const submitted_documents = [];
    files.forEach((f) => {
      // Clean up filename to match our norm: e.g. "Police Report.pdf" -> "Police Report"
      const docName = f.name.replace(/\.pdf$/i, "").trim();
      document_urls[docName] = URL.createObjectURL(f);
      submitted_documents.push(docName);
    });

    const newClaim = {
      claim_id: `CLM${Math.floor(9000 + Math.random() * 999)}`,
      audit_id: `AUD-${Date.now()}`,
      claim_type: "Vehicle Accident",
      complexity: "HIGH",
      criticality: "URGENT",
      confidence_score: 81,
      assigned_team: "Motor Claims",
      team_assignment_reason:
        "High-value vehicle accident with third-party liability — routed to Motor Claims for specialist assessment.",
      priority_score: 78,
      priority_reason:
        "Significant repair estimate with SLA window under 48 hours.",
      risk_score: 72,
      risk_factors: [
        "Third-party involvement increases liability exposure",
        "Claimant history: 2 prior claims in 18 months",
        "Estimated repair exceeds insured declared value by 12%",
      ],
      fraud_flag: false,
      fraud_indicators: [],
      completion_percentage: 70,
      submitted_documents,
      document_urls,
      missing_documents: ["RC Book", "FIR Copy"],
      current_state_summary:
        "Claim received and triaged. Awaiting RC Book and FIR Copy before loss assessor can be appointed. Third-party vehicle details confirmed; liability assessment pending.",
      comparable_cases: ["CLM1024", "CLM1031"],
      settlement_low: 185000,
      settlement_high: 240000,
      settlement_justification:
        "Range based on 8 comparable motor accident claims in the last 90 days with similar damage profiles.",
      next_best_action: [
        "Request RC Book and FIR Copy from claimant within 24 hours.",
        "Appoint a loss assessor for on-site inspection.",
        "Initiate third-party liability check with insurer.",
      ],
      reasoning:
        "AI assigned URGENT priority due to the third-party component and the claimant's prior claim history. Confidence is high (81%) because document completeness is 70% and damage description is internally consistent. Settlement range is derived from comparable cases.",
    };

    MOCK_CLAIMS.push(newClaim);
    return newClaim;
  }

  // Real backend call
  const response = await fetch(`${BASE_URL}/api/claims/upload`, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upload failed: ${response.status} — ${detail}`);
  }
  const result = await response.json();
  return { ...result.claim, ...result.triage_result };
}

/**
 * POST /claims/:claimId/upload — append new PDFs to an existing claim
 * @param {string} claimId
 * @param {FormData} formData
 */
export async function uploadAdditionalDocuments(claimId, formData) {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 1500));
    const claim = MOCK_CLAIMS.find((c) => c.claim_id === claimId);
    if (!claim) throw new Error(`Claim ${claimId} not found`);
    
    const files = formData.getAll("files");
    files.forEach((f) => {
      const docName = f.name.replace(/\.pdf$/i, "").trim();
      if (!claim.submitted_documents.includes(docName)) {
        claim.submitted_documents.push(docName);
      }
      if (!claim.document_urls) claim.document_urls = {};
      claim.document_urls[docName] = URL.createObjectURL(f);
      
      const normDocName = docName.toLowerCase();
      claim.missing_documents = claim.missing_documents.filter(md => md.toLowerCase() !== normDocName);
    });
    
    claim.completion_percentage = Math.min(100, claim.completion_percentage + (files.length * 15));
    return claim;
  }

  const response = await fetch(`${BASE_URL}/api/claims/${claimId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upload failed: ${response.status} — ${detail}`);
  }
  const result = await response.json();
  return { ...result.claim, ...result.triage_result };
}

/**
 * GET /audit/settlements — settlement range vs approved amount per claim.
 *
 * ⚠️  BACKEND DEPENDENCY: Requires FastAPI endpoint GET /audit/settlements
 * returning an array of:
 * {
 *   claim_id: string;
 *   assigned_team: string;
 *   settlement_low: number;
 *   settlement_high: number;
 *   approved_amount: number;    // what the handler actually approved
 *   approved_by: string;        // handler name (optional)
 *   approved_at: string;        // ISO timestamp (optional)
 * }
 *
 * Mock fallback: derived from MOCK_CLAIMS where settlement_low is non-null,
 * with a simulated approved_amount between settlement_low and settlement_high.
 */
export async function fetchSettlements() {
  const data = await safeFetch(`${BASE_URL}/api/audit/settlements`);
  if (data) return data;

  // Mock fallback — clearly marked
  console.warn("[ClaimWise AI] /audit/settlements not available. Using mock settlement data.");
  const settled = MOCK_CLAIMS.filter((c) => c.settlement_low != null);
  return settled.map((c) => {
    const range = (c.settlement_high ?? c.settlement_low) - c.settlement_low;
    // Simulate approved amount: usually within range, occasionally over/under
    const variance = (Math.random() - 0.35) * range * 0.6;
    const approved = Math.round(c.settlement_low + (range / 2) + variance);
    return {
      claim_id:        c.claim_id,
      assigned_team:   c.assigned_team,
      settlement_low:  c.settlement_low,
      settlement_high: c.settlement_high ?? c.settlement_low,
      approved_amount: Math.max(0, approved),
    };
  });
}

/**
 * POST /claims/:claimId/feedback — handler decision (approve/reject/escalate/etc.)
 * Shared internal helper used by all action functions.
 */
async function _submitFeedback(claimId, action, notes = "") {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 600));
    // Update in-memory status so TeamQueue/ClaimDetail reflects the change
    const claim = MOCK_CLAIMS.find((c) => c.claim_id === claimId);
    if (claim) claim.status = action;
    return { status: "ok", claim_id: claimId, action, new_status: action };
  }

  const response = await fetch(`${BASE_URL}/api/claims/${claimId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handler_action: action, notes }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Decision failed: ${response.status} — ${detail}`);
  }
  return response.json();
}

export const approveClaim     = (id) => _submitFeedback(id, "APPROVED");
export const rejectClaim      = (id) => _submitFeedback(id, "REJECTED");
export const escalateClaim    = (id) => _submitFeedback(id, "ESCALATED");
export const markUnderReview  = (id) => _submitFeedback(id, "UNDER_REVIEW");
export const markInProcess    = (id) => _submitFeedback(id, "IN_PROCESS");

