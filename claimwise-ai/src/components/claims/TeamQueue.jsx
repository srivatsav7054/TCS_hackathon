import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, FileWarning, ShieldAlert } from "lucide-react";
import PriorityBadge from "./PriorityBadge";
import RiskMeter from "./RiskMeter";
import CompletionBar from "./CompletionBar";

/**
 * TeamQueue — reusable priority queue table.
 * @param {Array}    claims      Pre-fetched claims array
 * @param {string}   team        Filter by team name; null = all teams
 * @param {boolean}  compact     Compact row height for admin cross-team view
 * @param {number}   limit       Max rows; null = all
 * @param {function} onRowClick  Callback when a row is clicked (passes claim_id). If omitted, navigates to ClaimDetail.
 */
export default function TeamQueue({ claims = [], team = null, compact = false, limit = null, onRowClick = null }) {
  const navigate = useNavigate();

  const filtered = team ? claims.filter((c) => c.assigned_team === team) : claims;
  const sorted   = [...filtered].sort((a, b) => b.priority_score - a.priority_score);
  const rows     = limit ? sorted.slice(0, limit) : sorted;

  if (rows.length === 0) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <FileWarning size={28} color="var(--color-text-muted)" style={{ margin: "0 auto 8px" }} />
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", margin: 0 }}>
          No claims in queue
        </p>
      </div>
    );
  }

  const showTeam = !team;
  const rowH = compact ? 38 : 46;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)" }}>
            {["Claim ID", ...(showTeam ? ["Team"] : []), "Type", "Amount", "Priority", "Risk", ...(compact ? [] : ["Docs", "SLA"]), "Score"].map((h) => (
              <th
                key={h}
                style={{
                  padding: compact ? "8px 12px" : "10px 14px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  textAlign: h === "Amount" || h === "Score" ? "right" : "left",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((claim) => {
            const isCrit = claim.criticality === "CRITICAL";
            return (
              <tr
                key={claim.claim_id}
                className={`queue-row ${isCrit ? "row-critical" : ""}`}
                style={{ height: rowH }}
                onClick={() => onRowClick ? onRowClick(claim.claim_id) : navigate(`/claim/${claim.claim_id}`)}
              >
                {/* Claim ID */}
                <td style={{ padding: compact ? "0 12px" : "0 14px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      className="data-mono"
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-accent)",
                      }}
                    >
                      {claim.claim_id}
                    </span>
                    {claim.fraud_flag && (
                      <AlertTriangle
                        size={11}
                        color="#9F1239"
                        strokeWidth={2.5}
                        title="Fraud signal"
                      />
                    )}
                    {claim.hours_remaining != null && claim.hours_remaining < 6 && (
                      <Clock
                        size={11}
                        color="#D97706"
                        strokeWidth={2.5}
                        title={`${claim.hours_remaining}h SLA`}
                      />
                    )}
                  </div>
                </td>

                {/* Team (cross-team view only) */}
                {showTeam && (
                  <td
                    style={{
                      padding: compact ? "0 12px" : "0 14px",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-secondary)",
                      maxWidth: 130,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {claim.assigned_team}
                  </td>
                )}

                {/* Type */}
                <td
                  style={{
                    padding: compact ? "0 12px" : "0 14px",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-secondary)",
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {claim.claim_type}
                </td>

                {/* Amount */}
                <td style={{ padding: compact ? "0 12px" : "0 14px", textAlign: "right" }}>
                  <span
                    className="data-mono"
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}
                  >
                    {fmtAmt(claim.claim_amount)}
                  </span>
                </td>

                {/* Priority badge */}
                <td style={{ padding: compact ? "0 12px" : "0 14px" }}>
                  <PriorityBadge criticality={claim.criticality} compact />
                </td>

                {/* Risk meter */}
                <td style={{ padding: compact ? "0 12px" : "0 14px", minWidth: 110 }}>
                  <RiskMeter score={claim.risk_score} compact />
                </td>

                {/* Docs (full only) */}
                {!compact && (
                  <td style={{ padding: "0 14px", minWidth: 90 }}>
                    <CompletionBar
                      completion={claim.completion_percentage}
                      submitted={claim.submitted_documents}
                      required={claim.required_documents}
                      compact
                    />
                  </td>
                )}

                {/* SLA (full only) */}
                {!compact && (
                  <td style={{ padding: "0 14px", textAlign: "center" }}>
                    {claim.hours_remaining != null ? (
                      <span
                        className="data-mono"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            claim.hours_remaining < 6
                              ? "#DC2626"
                              : claim.hours_remaining < 24
                              ? "#D97706"
                              : "var(--color-text-muted)",
                        }}
                      >
                        {claim.hours_remaining}h
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>—</span>
                    )}
                  </td>
                )}

                {/* Priority score */}
                <td style={{ padding: compact ? "0 12px" : "0 14px", textAlign: "right" }}>
                  <span
                    className="data-mono"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color:
                        claim.priority_score >= 85
                          ? "#DC2626"
                          : claim.priority_score >= 65
                          ? "#D97706"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {claim.priority_score}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function fmtAmt(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
