import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, FileText, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Clock, Loader } from "lucide-react";
import { fetchClaim, fetchClaims, approveClaim, rejectClaim, escalateClaim, markUnderReview } from "../api/claimsApi";
import { useAuth } from "../context/AuthContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import Navbar from "../components/layout/Navbar";
import GovernanceFooter from "../components/layout/GovernanceFooter";
import FraudAlert from "../components/claims/FraudAlert";
import PriorityBadge from "../components/claims/PriorityBadge";
import RiskMeter from "../components/claims/RiskMeter";
import CompletionBar from "../components/claims/CompletionBar";
import MissingInfoChecklist from "../components/claims/MissingInfoChecklist";
import Spinner from "../components/ui/Spinner";
import { TEAMS } from "../data/mockClaims";

export default function ClaimDetail() {
  const { claimId }   = useParams();
  const { role, team } = useAuth();
  const navigate       = useNavigate();

  const [claim, setClaim]         = useState(null);
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [whyOpen, setWhyOpen]     = useState(false);
  const [docsOpen, setDocsOpen]   = useState(true);
  const [reassignTeam, setReassign] = useState("");
  const [claimStatus, setClaimStatus] = useState(null); // live status from API/mock
  const [actionLoading, setActionLoading] = useState(null); // which action is loading
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchClaim(claimId),
      role === "admin" ? fetchClaims() : fetchClaims(team),
    ])
      .then(([c, list]) => {
        setClaim(c);
        setAllClaims(list);
        setReassign(c.assigned_team);
        setClaimStatus(c.status || "PENDING");
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [claimId, role, team]);

  if (loading) {
    return (
      <NotificationsProvider claims={[]}>
        <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spinner />
          </div>
        </div>
      </NotificationsProvider>
    );
  }

  if (error || !claim) {
    return (
      <NotificationsProvider claims={[]}>
        <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)", color: "var(--color-text-primary)", margin: 0 }}>
              Claim not found
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", margin: 0 }}>{error}</p>
            <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => navigate(-1)}>← Go back</button>
          </div>
        </div>
      </NotificationsProvider>
    );
  }

  const isHandlerOnTeam = role === "handler" && team === claim.assigned_team;
  const isAdmin         = role === "admin";
  const backPath        = isAdmin ? "/admin" : `/team/${encodeURIComponent(team)}`;
  const backLabel       = isAdmin ? "Admin" : team;

  const handleApprove = async () => _doAction("approve", approveClaim);
  const handleReject  = async () => _doAction("reject",  rejectClaim);
  const handleEscalate= async () => _doAction("escalate",escalateClaim);
  const handleReview  = async () => _doAction("review",  markUnderReview);

  async function _doAction(key, fn) {
    setActionLoading(key);
    setActionError(null);
    try {
      await fn(claim.claim_id);
      const nextStatus = { approve: "APPROVED", reject: "REJECTED", escalate: "ESCALATED", review: "UNDER_REVIEW" }[key];
      setClaimStatus(nextStatus);
      setClaim(prev => ({ ...prev, status: nextStatus }));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <NotificationsProvider claims={allClaims}>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
        <Navbar />
        <main
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "24px 24px 40px",
          }}
        >
          {/* ── Breadcrumb ── */}
          <nav style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <Link
              to={backPath}
              style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}
            >
              {backLabel}
            </Link>
            <span style={{ fontSize: 12, color: "var(--color-border)" }}>/</span>
            <span
              className="data-mono"
              style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}
            >
              {claim.claim_id}
            </span>
          </nav>

          {/* ── Fraud Alert — FIRST ── */}
          {claim.fraud_flag && <FraudAlert indicators={claim.fraud_indicators} />}

          {/* ── Claim header card ── */}
          <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h1 className="data-mono" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {claim.claim_id}
                  </h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PriorityBadge criticality={claim.criticality} score={claim.priority_score} />
                    <StatusBadge status={claimStatus} />
                    {claim.fraud_flag && (
                      <span className="badge-fraud" style={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600, padding: "2px 7px", borderRadius: 3 }}>
                        Fraud Signal
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  {claim.claim_type}
                </p>
                <p style={{ margin: "2px 0 0", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  Assigned to <strong style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>{claim.assigned_team}</strong>
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p
                  className="data-mono"
                  style={{ margin: 0, fontSize: 30, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1 }}
                >
                  {fmtAmt(claim.claim_amount)}
                </p>
                <p style={{ margin: "4px 0 0", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  Claimed Amount
                </p>
              </div>
            </div>

            {/* Score row */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid var(--color-border)",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                alignItems: "center",
              }}
            >
              <ScoreStat
                label="Priority Score"
                value={claim.priority_score}
                color={claim.priority_score >= 85 ? "#DC2626" : claim.priority_score >= 65 ? "#D97706" : "var(--color-text-secondary)"}
              />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RiskMeter score={claim.risk_score} />
              </div>
              <ScoreStat
                label="AI Confidence"
                value={`${claim.confidence_score}%`}
                color="var(--color-accent)"
              />
              <ScoreStat
                label="SLA Window"
                value={claim.hours_remaining != null ? `${claim.hours_remaining}h` : "—"}
                color={
                  claim.hours_remaining == null ? "var(--color-text-muted)"
                  : claim.hours_remaining < 6   ? "#DC2626"
                  : claim.hours_remaining < 24  ? "#D97706"
                  : "var(--color-text-secondary)"
                }
              />
            </div>
          </div>

          {/* ── Main two-column layout ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12, alignItems: "start" }}>

            {/* ── Left column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Documentation */}
              <section className="card" style={{ padding: "16px 20px" }}>
                <SectionTitle>Documentation Status</SectionTitle>
                <div style={{ marginBottom: 16 }}>
                  <CompletionBar
                    completion={claim.completion_percentage}
                    submitted={claim.submitted_documents}
                    required={claim.required_documents}
                  />
                </div>
                <MissingInfoChecklist
                  missingDocuments={claim.missing_documents}
                  missingFields={claim.missing_fields}
                  submittedDocuments={claim.submitted_documents}
                  requiredDocuments={claim.required_documents}
                  documentUrls={claim.document_urls}
                />
              </section>

              {/* ── PDF Document Viewer ── */}
              {claim.document_urls && Object.keys(claim.document_urls).length > 0 && (
                <section className="card" style={{ overflow: "hidden" }}>
                  <button
                    onClick={() => setDocsOpen(o => !o)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px", background: "none", border: "none", cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--color-bg)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={15} color="var(--color-accent)" />
                      Claim Documents ({Object.keys(claim.document_urls).length})
                    </span>
                    {docsOpen ? <ChevronUp size={16} color="var(--color-text-muted)" /> : <ChevronDown size={16} color="var(--color-text-muted)" />}
                  </button>

                  {docsOpen && (
                    <div style={{ borderTop: "1px solid var(--color-border)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {Object.entries(claim.document_urls).map(([name, url]) => (
                        <PdfDocViewer key={name} name={name} url={url} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Current state */}
              <section className="card" style={{ padding: "16px 20px" }}>
                <SectionTitle>Current State</SectionTitle>
                <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
                  {claim.current_state_summary}
                </p>
              </section>

              {/* Next best actions */}
              <section className="card" style={{ padding: "16px 20px" }}>
                <SectionTitle>Next Best Actions</SectionTitle>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {claim.next_best_action.map((action, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span
                        className="data-mono"
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          backgroundColor: "var(--color-primary)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 1,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5, paddingTop: 2 }}>
                        {action}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Expandable — Why this decision? */}
              <section className="card" style={{ overflow: "hidden" }}>
                <button
                  onClick={() => setWhyOpen((o) => !o)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}
                  >
                    Why this decision?
                  </span>
                  {whyOpen
                    ? <ChevronUp size={16} color="var(--color-text-muted)" />
                    : <ChevronDown size={16} color="var(--color-text-muted)" />
                  }
                </button>

                {whyOpen && (
                  <div
                    style={{
                      padding: "0 20px 20px",
                      borderTop: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      paddingTop: 16,
                    }}
                  >
                    {claim.risk_factors?.length > 0 && (
                      <WhyBlock label="Risk Factors" labelColor="var(--color-text-muted)">
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                          {claim.risk_factors.map((f, i) => (
                            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                              <span style={{ color: "#D97706", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>▲</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </WhyBlock>
                    )}

                    {claim.fraud_indicators?.length > 0 && (
                      <WhyBlock label="Fraud Indicators" labelColor="#9F1239">
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                          {claim.fraud_indicators.map((f, i) => (
                            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "#881337", lineHeight: 1.5 }}>
                              <span style={{ flexShrink: 0, marginTop: 1 }}>!</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </WhyBlock>
                    )}

                    <WhyBlock label="Team Assignment Reason">
                      <p style={proseSm}>{claim.team_assignment_reason}</p>
                    </WhyBlock>

                    <WhyBlock label="Priority Reason">
                      <p style={proseSm}>{claim.priority_reason}</p>
                    </WhyBlock>

                    <WhyBlock label="AI Reasoning" bg="var(--color-bg)">
                      <p style={proseSm}>{claim.reasoning}</p>
                    </WhyBlock>
                  </div>
                )}
              </section>
            </div>

            {/* ── Right column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Comparable cases — secondary visual weight via bg tone */}
              <section
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  padding: "14px 16px",
                }}
              >
                <p className="section-label" style={{ marginBottom: 10 }}>Comparable Cases</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {claim.comparable_cases.map((c) => (
                    <Link
                      key={c}
                      to={`/claim/${c}`}
                      className="data-mono"
                      style={{
                        fontSize: 12,
                        color: "var(--color-accent)",
                        textDecoration: "none",
                        backgroundColor: "rgba(44,110,140,0.09)",
                        border: "1px solid rgba(44,110,140,0.2)",
                        padding: "2px 8px",
                        borderRadius: 3,
                      }}
                    >
                      {c}
                    </Link>
                  ))}
                </div>

                <div
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    padding: "10px 12px",
                    marginBottom: 10,
                  }}
                >
                  <p className="section-label" style={{ marginBottom: 4 }}>Settlement Range</p>
                  <p
                    className="data-mono"
                    style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}
                  >
                    {fmtAmt(claim.settlement_low)} – {fmtAmt(claim.settlement_high)}
                  </p>
                </div>

                <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: 1.55 }}>
                  {claim.settlement_justification}
                </p>
              </section>

              {/* Claim metadata */}
              <section className="card" style={{ padding: "14px 16px" }}>
                <p className="section-label" style={{ marginBottom: 10 }}>Claim Information</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <MetaRow label="Complexity" value={
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                        color: claim.complexity === "HIGH" ? "#DC2626" : claim.complexity === "MEDIUM" ? "#D97706" : "#64748B",
                      }}
                    >
                      {claim.complexity}
                    </span>
                  } />
                  <MetaRow label="Assigned Team"  value={claim.assigned_team} />
                  <MetaRow label="Claim Type"     value={claim.claim_type} />
                </div>
              </section>

              {/* Actions panel */}
              {(isHandlerOnTeam || isAdmin) && (
                <section className="card" style={{ padding: "14px 16px" }}>
                  <p className="section-label" style={{ marginBottom: 12 }}>Handler Actions</p>

                  {/* Status banner */}
                  {claimStatus && claimStatus !== "PENDING" && (
                    <div style={{ marginBottom: 10 }}>
                      <StatusBadge status={claimStatus} large />
                    </div>
                  )}

                  {actionError && (
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#DC2626", marginBottom: 8 }}>
                      {actionError}
                    </div>
                  )}

                  {isHandlerOnTeam && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <ActionBtn
                        label={actionLoading === "approve" ? "Approving…" : "✓  Approve Claim"}
                        bg="#16A34A" hover="#15803D"
                        onClick={handleApprove}
                        disabled={!!actionLoading || claimStatus === "APPROVED" || claimStatus === "REJECTED"}
                      />
                      <ActionBtn
                        label={actionLoading === "review" ? "Marking…" : "⏳  Mark Under Review"}
                        bg="#2563EB" hover="#1D4ED8"
                        onClick={handleReview}
                        disabled={!!actionLoading || claimStatus === "APPROVED" || claimStatus === "REJECTED"}
                      />
                      <ActionBtn
                        label={actionLoading === "escalate" ? "Escalating…" : "↑  Escalate to Senior Officer"}
                        bg="#7C3AED" hover="#6D28D9"
                        onClick={handleEscalate}
                        disabled={!!actionLoading || claimStatus === "APPROVED" || claimStatus === "REJECTED"}
                      />
                      <ActionBtn
                        label={actionLoading === "reject" ? "Rejecting…" : "✕  Reject Claim"}
                        bg="#DC2626" hover="#B91C1C"
                        onClick={handleReject}
                        disabled={!!actionLoading || claimStatus === "APPROVED" || claimStatus === "REJECTED"}
                      />
                    </div>
                  )}

                  {isAdmin && !isHandlerOnTeam && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={{ margin: "0 0 4px", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                        Reassign to team
                      </p>
                      <select
                        value={reassignTeam}
                        onChange={e => setReassign(e.target.value)}
                        style={{ width: "100%", border: "1px solid var(--color-border)", borderRadius: 4, padding: "7px 10px", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface)", outline: "none", cursor: "pointer" }}
                      >
                        {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ActionBtn
                        label="Confirm Reassignment"
                        bg="var(--color-primary)" hover="#162e4d"
                        onClick={() => setClaimStatus("IN_PROCESS")}
                      />
                    </div>
                  )}

                  {(claimStatus === "APPROVED" || claimStatus === "REJECTED") && (
                    <p style={{ margin: "8px 0 0", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--color-text-muted)", textAlign: "center" }}>
                      This claim is {claimStatus.toLowerCase()} and locked.
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>

          <GovernanceFooter />
        </main>
      </div>
    </NotificationsProvider>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function SectionTitle({ children }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: "var(--text-sm)",
        color: "var(--color-text-primary)",
        margin: "0 0 12px",
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </h2>
  );
}

function ScoreStat({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span className="data-mono" style={{ fontSize: 32, fontWeight: 600, color, lineHeight: 1 }}>
        {value}
      </span>
      <span className="section-label">{label}</span>
    </div>
  );
}

function WhyBlock({ label, children, labelColor = "var(--color-text-muted)", bg }) {
  return (
    <div style={{ backgroundColor: bg, borderRadius: bg ? 4 : 0, padding: bg ? "10px 12px" : 0 }}>
      <p className="section-label" style={{ marginBottom: 6, color: labelColor }}>{label}</p>
      {children}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", fontWeight: 500, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({ label, bg, hover, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        backgroundColor: disabled ? "#94A3B8" : bg,
        color: "#fff",
        border: "none",
        padding: "9px 0",
        borderRadius: 4,
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.15s ease",
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = hover; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = bg; }}
    >
      {label}
    </button>
  );
}

const proseSm = {
  margin: 0,
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  color: "var(--color-text-secondary)",
  lineHeight: 1.65,
};

function fmtAmt(n) {
  if (!n && n !== 0) return "—";
  if (n === 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

/* ── StatusBadge ─────────────────────────────────────────── */
const STATUS_CONFIG = {
  PENDING:      { label: "Pending",       bg: "rgba(100,116,139,0.1)", color: "#475569", border: "rgba(100,116,139,0.25)" },
  IN_PROCESS:   { label: "In Process",    bg: "rgba(234,179,8,0.1)",   color: "#92400E", border: "rgba(234,179,8,0.3)" },
  UNDER_REVIEW: { label: "Under Review",  bg: "rgba(37,99,235,0.1)",   color: "#1D4ED8", border: "rgba(37,99,235,0.25)" },
  ESCALATED:    { label: "Escalated",     bg: "rgba(124,58,237,0.1)",  color: "#6D28D9", border: "rgba(124,58,237,0.25)" },
  APPROVED:     { label: "Approved",      bg: "rgba(22,163,74,0.1)",   color: "#15803D", border: "rgba(22,163,74,0.2)" },
  REJECTED:     { label: "Rejected",      bg: "rgba(220,38,38,0.1)",   color: "#B91C1C", border: "rgba(220,38,38,0.2)" },
};

function StatusBadge({ status, large = false }) {
  if (!status || status === "PENDING") return null;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const iconMap = {
    PENDING: Clock, IN_PROCESS: Loader, UNDER_REVIEW: Clock,
    ESCALATED: AlertTriangle, APPROVED: CheckCircle2, REJECTED: XCircle
  };
  const Icon = iconMap[status] || Clock;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      backgroundColor: cfg.bg, color: cfg.color,
      border: "1px solid " + cfg.border,
      padding: large ? "7px 14px" : "3px 8px",
      borderRadius: 4, fontFamily: "var(--font-sans)",
      fontSize: large ? "var(--text-sm)" : "var(--text-xs)",
      fontWeight: 600, width: large ? "100%" : "auto",
      justifyContent: large ? "center" : "flex-start",
    }}>
      <Icon size={large ? 14 : 11} />
      {cfg.label}
    </span>
  );
}

/* ── PdfDocViewer ─────────────────────────────────────────── */
function PdfDocViewer({ name, url }) {
  const [expanded, setExpanded] = useState(false);
  const isServable = url && (url.startsWith("/api/") || url.startsWith("blob:") || url.startsWith("http"));
  const displayUrl = isServable
    ? (url.startsWith("/api/") ? "http://localhost:8000" + url : url)
    : null;
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 6, overflow: "hidden", backgroundColor: "var(--color-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: expanded ? "1px solid var(--color-border)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={14} color="var(--color-accent)" />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-primary)", fontWeight: 500 }}>{name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {displayUrl ? (
            <>
              <a href={displayUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--color-accent)", textDecoration: "none", padding: "3px 8px", border: "1px solid rgba(44,110,140,0.25)", borderRadius: 3 }}>
                <ExternalLink size={11} /> Open
              </a>
              <button onClick={() => setExpanded(e => !e)}
                style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--color-text-muted)", background: "none", border: "1px solid var(--color-border)", borderRadius: 3, padding: "3px 8px", cursor: "pointer" }}>
                {expanded ? "Hide" : "Preview"}
              </button>
            </>
          ) : (
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--color-text-muted)", fontStyle: "italic" }}>Not available in mock mode</span>
          )}
        </div>
      </div>
      {expanded && displayUrl && (
        <iframe src={displayUrl} title={name} style={{ width: "100%", height: 480, border: "none", display: "block", backgroundColor: "#f8f8f8" }} />
      )}
    </div>
  );
}
