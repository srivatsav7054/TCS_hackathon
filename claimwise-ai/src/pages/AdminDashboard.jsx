import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchClaims } from "../api/claimsApi";
import { TEAMS } from "../data/mockClaims";
import Navbar from "../components/layout/Navbar";
import GovernanceFooter from "../components/layout/GovernanceFooter";
import KPICard from "../components/claims/KPICard";
import TeamSummaryCard from "../components/claims/TeamSummaryCard";
import TeamQueue from "../components/claims/TeamQueue";
import AISummaryPanel from "../components/claims/AISummaryPanel";
import { NotificationsProvider } from "../context/NotificationsContext";
import Spinner from "../components/ui/Spinner";

const AUDIT = [
  { t: "13:42", e: "CLM7001 auto-escalated to Senior/Complex Review — multi-policy trigger" },
  { t: "13:31", e: "CLM6001 frozen — staged accident fraud ring detected by analytics" },
  { t: "13:18", e: "CLM1024 referred to Fraud Investigation — 3 prior claims in 24 months" },
  { t: "13:05", e: "CLM3011 loss adjustor appointed — Sharma & Associates" },
  { t: "12:57", e: "CLM2015 cashless pre-auth extended by 24 hours" },
  { t: "12:44", e: "CLM5001 legal counsel engaged — Kapoor & Partners" },
  { t: "12:30", e: "CLM6018 payout hold placed — identity mismatch detected" },
  { t: "12:11", e: "CLM4017 referred to Fraud Investigation — jewellery claim exceeds schedule" },
  { t: "11:58", e: "CLM1031 RC book request sent to claimant" },
  { t: "11:42", e: "CLM2031 claim put on hold — duplicate submission across policies" },
];



export default function AdminDashboard() {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePanelClaimId, setActivePanelClaimId] = useState(null);

  useEffect(() => {
    fetchClaims().then((d) => { setClaims(d); setLoading(false); });
  }, []);

  const critical     = claims.filter((c) => c.criticality === "CRITICAL").length;
  const slaRisk      = claims.filter((c) => c.hours_remaining != null && c.hours_remaining < 12).length;
  const fraudSignals = claims.filter((c) => c.fraud_flag).length;

  // Stacked distribution: % of each team's claims that are LOW / MEDIUM / HIGH risk
  // Comparable across teams regardless of case-mix (Fraud will always have 100% HIGH
  // by design — that's the correct signal, not a bug).
  const chartData = TEAMS.map((t) => {
    const tc    = claims.filter((c) => c.assigned_team === t);
    const total = tc.length || 1; // avoid div/0
    const low   = tc.filter((c) => c.risk_score < 50).length;
    const med   = tc.filter((c) => c.risk_score >= 50 && c.risk_score < 75).length;
    const high  = tc.filter((c) => c.risk_score >= 75).length;
    return {
      team: t.split(" ")[0],
      LOW:  Math.round((low  / total) * 100),
      MED:  Math.round((med  / total) * 100),
      HIGH: Math.round((high / total) * 100),
    };
  });

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
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* ── Page title ── */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div>
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
                Admin Dashboard
              </h1>
              <p style={{ margin: "3px 0 0", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                All-teams view — {claims.length} active claims
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link
                to="/admin/settlement-audit"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  border: "1px solid var(--color-border)",
                  padding: "5px 10px",
                  borderRadius: 4,
                  transition: "background-color 0.15s ease",
                  backgroundColor: "var(--color-surface)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface)")}
              >
                Settlement Audit →
              </Link>
              <span
                className="data-mono"
                style={{ fontSize: 12, color: "var(--color-text-muted)" }}
              >
                {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {/* ── KPI bar ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KPICard label="Total Claims"    value={claims.length} accentColor="var(--color-primary)" />
            <KPICard label="Critical"        value={critical}      accentColor="#DC2626" sub="Immediate attention required" />
            <KPICard label="SLA Breach Risk" value={slaRisk}       accentColor="#D97706" sub="< 12 hours remaining" />
            <KPICard label="Fraud Signals"   value={fraudSignals}  accentColor="#9F1239" sub="Across all teams" />
          </div>

          {/* ── Team cards ── */}
          <section>
            <SectionTitle title="Team Overview" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {TEAMS.map((t) => (
                <TeamSummaryCard key={t} team={t} claims={claims.filter((c) => c.assigned_team === t)} />
              ))}
            </div>
          </section>

          {/* ── Priority table + chart ── */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>

            {/* Cross-team priority */}
            <section className="card" style={{ overflow: "hidden" }}>
              <SectionHeader title="Cross-Team Priority Queue" note="Top 10 by priority score" />
              <TeamQueue claims={claims} team={null} compact limit={10} onRowClick={setActivePanelClaimId} />
            </section>

            {/* Risk distribution chart */}
            <section className="card" style={{ padding: "16px 16px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionTitle title="Risk Distribution by Team" />
                <div style={{ display: "flex", gap: 12 }}>
                  {[{ label: "Low", color: "#16A34A" }, { label: "Medium", color: "#D97706" }, { label: "High", color: "#DC2626" }].map(({ label, color }) => (
                    <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, display: "inline-block" }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={chartData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                  <XAxis
                    dataKey="team"
                    tick={{ fontSize: 10, fontFamily: "var(--font-sans)", fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v, name) => [`${v}%`, name]}
                    cursor={{ fill: "rgba(30,58,95,0.04)" }}
                    contentStyle={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      border: "1px solid var(--color-border)",
                      borderRadius: 4,
                      boxShadow: "0 2px 8px rgba(30,58,95,0.08)",
                    }}
                  />
                  <Bar dataKey="LOW"  stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} name="Low" />
                  <Bar dataKey="MED"  stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} name="Medium" />
                  <Bar dataKey="HIGH" stackId="a" fill="#DC2626" radius={[3, 3, 0, 0]} name="High" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          {/* ── Audit trail ── */}
          <section className="card" style={{ overflow: "hidden" }}>
            <SectionHeader title="Global Audit Trail" />
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {AUDIT.map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    padding: "8px 16px",
                    borderBottom: i < AUDIT.length - 1 ? "1px solid var(--color-bg)" : "none",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span
                    className="data-mono"
                    style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0, marginTop: 1, width: 36 }}
                  >
                    {item.t}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.e}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <GovernanceFooter />
          
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

function SectionTitle({ title }) {
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
      {title}
    </h2>
  );
}

function SectionHeader({ title, note }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "var(--color-bg)",
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
        {title}
      </span>
      {note && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          {note}
        </span>
      )}
    </div>
  );
}
