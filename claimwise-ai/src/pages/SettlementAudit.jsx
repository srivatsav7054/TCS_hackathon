import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Info } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { NotificationsProvider } from "../context/NotificationsContext";
import Spinner from "../components/ui/Spinner";
import { fetchSettlements as getSettlements } from "../api/claimsApi";

// ─── SettlementAuditTable ─────────────────────────────────────────────────
// Standalone component: drop it in or pull it out without touching other views.
// ⚠️  Backend dependency: GET /audit/settlements — see claimsApi.fetchSettlements
//     for the full contract. Falls back to mock data if the endpoint is unavailable.
// ─────────────────────────────────────────────────────────────────────────────
function SettlementAuditTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", margin: 0 }}>
          No settlement data available.
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)" }}>
            {["Claim ID", "Team", "Suggested Range", "Approved Amount", "Delta"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 16px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  textAlign: h === "Suggested Range" || h === "Approved Amount" || h === "Delta" ? "right" : "left",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const delta     = row.approved_amount - Math.round((row.settlement_low + row.settlement_high) / 2);
            const isOver    = delta > 0;
            const deltaColor = Math.abs(delta) < 5000 ? "var(--color-text-muted)" : isOver ? "#DC2626" : "#16A34A";
            const deltaLabel = (delta >= 0 ? "+" : "") + fmtAmt(delta);

            return (
              <tr
                key={row.claim_id}
                style={{ borderBottom: "1px solid var(--color-bg)", transition: "background-color 0.1s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* Claim ID */}
                <td style={{ padding: "10px 16px" }}>
                  <Link
                    to={`/claim/${row.claim_id}`}
                    className="data-mono"
                    style={{ fontSize: 13, fontWeight: 500, color: "var(--color-accent)", textDecoration: "none" }}
                  >
                    {row.claim_id}
                  </Link>
                </td>

                {/* Team */}
                <td style={{ padding: "10px 16px", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  {row.assigned_team}
                </td>

                {/* Suggested range */}
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <span className="data-mono" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    {fmtAmt(row.settlement_low)} – {fmtAmt(row.settlement_high)}
                  </span>
                </td>

                {/* Approved amount */}
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <span className="data-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {fmtAmt(row.approved_amount)}
                  </span>
                </td>

                {/* Delta */}
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <span
                    className="data-mono"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: deltaColor,
                    }}
                  >
                    {deltaLabel}
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

// ─── Page ─────────────────────────────────────────────────────────────────
export default function SettlementAudit() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    getSettlements()
      .then((d) => { setRows(d); setLoad(false); })
      .catch((e) => { setError(e.message); setLoad(false); });
  }, []);

  const totalOver  = rows.filter((r) => r.approved_amount > r.settlement_high).length;
  const totalUnder = rows.filter((r) => r.approved_amount < r.settlement_low).length;
  const totalMatch = rows.length - totalOver - totalUnder;

  return (
    <NotificationsProvider claims={[]}>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
        <Navbar />
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 48px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to="/admin" style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)", textDecoration: "none" }}>
              <ArrowLeft size={14} />
              Admin
            </Link>
            <span style={{ color: "var(--color-border)" }}>/</span>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
              Settlement Audit
            </h1>
          </div>

          {/* Backend dependency notice */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, backgroundColor: "var(--color-urgent-bg)", border: "1px solid var(--color-urgent-border)", borderRadius: 6, padding: "12px 14px" }}>
            <Info size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "#92400E", lineHeight: 1.5 }}>
              <strong style={{ fontWeight: 600 }}>Backend dependency:</strong> This view reads from{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, backgroundColor: "rgba(217,119,6,0.1)", padding: "1px 4px", borderRadius: 2 }}>
                GET /audit/settlements
              </code>
              . Currently showing mock data derived from existing claims. When the endpoint is live, set{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, backgroundColor: "rgba(217,119,6,0.1)", padding: "1px 4px", borderRadius: 2 }}>
                MOCK_MODE = false
              </code>{" "}
              in <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>claimsApi.js</code>.
            </p>
          </div>

          {/* KPI chips */}
          {!loading && !error && rows.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              <StatChip label={`${rows.length} claims settled`} color="var(--color-primary)" bg="rgba(30,58,95,0.07)" border="rgba(30,58,95,0.18)" />
              <StatChip label={`${totalMatch} within range`} color="#16A34A" bg="rgba(22,163,74,0.07)" border="rgba(22,163,74,0.2)" />
              {totalOver  > 0 && <StatChip label={`${totalOver} over AI range`}  color="#DC2626" bg="rgba(220,38,38,0.07)" border="rgba(220,38,38,0.2)" />}
              {totalUnder > 0 && <StatChip label={`${totalUnder} under AI range`} color="#D97706" bg="rgba(217,119,6,0.07)"  border="rgba(217,119,6,0.2)" />}
            </div>
          )}

          {/* Table card */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
                AI Suggested vs Handler Approved
              </span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                Delta = Approved − midpoint of suggested range
              </span>
            </div>

            {loading && (
              <div style={{ padding: "48px 0", display: "flex", justifyContent: "center" }}>
                <Spinner />
              </div>
            )}

            {error && !loading && (
              <div style={{ padding: "24px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <AlertCircle size={16} color="#DC2626" />
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "#DC2626" }}>{error}</span>
              </div>
            )}

            {!loading && !error && <SettlementAuditTable rows={rows} />}
          </div>
        </main>
      </div>
    </NotificationsProvider>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function StatChip({ label, color, bg, border }) {
  return (
    <span className="data-mono" style={{ fontSize: 11, fontWeight: 600, color, backgroundColor: bg, border: `1px solid ${border}`, padding: "3px 10px", borderRadius: 3 }}>
      {label}
    </span>
  );
}

function fmtAmt(n) {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000)     return `${sign}₹${(abs / 1000).toFixed(0)}K`;
  return `${sign}₹${abs}`;
}
