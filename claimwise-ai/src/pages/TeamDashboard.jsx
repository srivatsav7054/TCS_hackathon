import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchClaims } from "../api/claimsApi";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
import TeamQueue from "../components/claims/TeamQueue";
import AISummaryPanel from "../components/claims/AISummaryPanel";
import { NotificationsProvider } from "../context/NotificationsContext";
import Spinner from "../components/ui/Spinner";

export default function TeamDashboard() {
  const { teamName }      = useParams();
  const team              = decodeURIComponent(teamName);
  const { role }          = useAuth();
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePanelClaimId, setActivePanelClaimId] = useState(null);

  useEffect(() => {
    fetchClaims(team).then((d) => { setClaims(d); setLoading(false); });
  }, [team]);

  const critical = claims.filter((c) => c.criticality === "CRITICAL").length;
  const slaRisk  = claims.filter((c) => c.hours_remaining != null && c.hours_remaining < 12).length;
  const fraud    = claims.filter((c) => c.fraud_flag).length;

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

  return (
    <NotificationsProvider claims={claims}>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
        <Navbar />
        <main
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "24px 24px 40px",
          }}
        >
          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            {role === "admin" && (
              <>
                <Link
                  to="/admin"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  ← Admin
                </Link>
                <span style={{ color: "var(--color-border)" }}>/</span>
              </>
            )}
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "var(--text-lg)",
                color: "var(--color-text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {team}
            </h1>

            {/* Stat chips */}
            <Chip label={`${claims.length} claims`} color="var(--color-accent)" bg="rgba(44,110,140,0.10)" border="rgba(44,110,140,0.20)" />
            {critical > 0 && (
              <Chip label={`${critical} critical`} color="#DC2626" bg="rgba(220,38,38,0.07)" border="rgba(220,38,38,0.18)" />
            )}
            {slaRisk > 0 && (
              <Chip label={`${slaRisk} SLA risk`} color="#D97706" bg="rgba(217,119,6,0.07)" border="rgba(217,119,6,0.18)" />
            )}
            {fraud > 0 && (
              <Chip label={`${fraud} fraud signal${fraud > 1 ? "s" : ""}`} color="#9F1239" bg="rgba(159,18,57,0.07)" border="rgba(159,18,57,0.18)" />
            )}
          </div>

          {/* ── Queue ── */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-primary)",
                }}
              >
                Priority Queue
              </span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                Sorted by priority score · Click a row to view AI Triage Summary
              </span>
            </div>
            <TeamQueue claims={claims} team={team} onRowClick={setActivePanelClaimId} />
          </div>

          <AISummaryPanel
            claimId={activePanelClaimId}
            claims={claims}
            isOpen={!!activePanelClaimId}
            onClose={() => setActivePanelClaimId(null)}
          />
        </main>
      </div>
    </NotificationsProvider>
  );
}

function Chip({ label, color, bg, border }) {
  return (
    <span
      className="data-mono"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        padding: "3px 8px",
        borderRadius: 3,
      }}
    >
      {label}
    </span>
  );
}
