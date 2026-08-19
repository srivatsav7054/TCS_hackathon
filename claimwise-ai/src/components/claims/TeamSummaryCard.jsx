import { Link } from "react-router-dom";
import { AlertTriangle, TrendingUp, Users } from "lucide-react";

const TEAM_ICONS = {
  "Motor Claims":           { icon: "🚗", label: "Motor" },
  "Health Claims":          { icon: "⚕", label: "Health" },
  "Property Claims":        { icon: "⌂", label: "Property" },
  "Life Claims":            { icon: "◈", label: "Life" },
  "Fraud Investigation":    { icon: "⌕", label: "Fraud" },
  "Senior/Complex Review":  { icon: "⚖", label: "Complex" },
};

/**
 * TeamSummaryCard — one per team on the Admin dashboard grid.
 * Card accent: left border in brand primary. No emoji icons for data.
 */
export default function TeamSummaryCard({ team, claims }) {
  const count    = claims.length;
  const highRisk = claims.filter((c) => c.risk_score >= 75).length;
  const critical = claims.filter((c) => c.criticality === "CRITICAL").length;
  const fraud    = claims.filter((c) => c.fraud_flag).length;
  const slug     = encodeURIComponent(team);

  return (
    <div
      className="card card-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderLeft: `3px solid var(--color-primary)`,
        overflow: "hidden",
      }}
    >
      {/* Team name */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--color-border)" }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            color: "var(--color-text-primary)",
            lineHeight: 1.3,
          }}
        >
          {team}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Stat icon={<Users size={11} color="var(--color-text-muted)" />} label="Claims" value={count} color="var(--color-text-primary)" />
        <Stat icon={<TrendingUp size={11} color={highRisk > 0 ? "#D97706" : "var(--color-text-muted)"} />} label="Hi-Risk" value={highRisk} color={highRisk > 0 ? "#D97706" : "var(--color-normal)"} />
        <Stat icon={<AlertTriangle size={11} color={critical > 0 ? "#DC2626" : "var(--color-text-muted)"} />} label="Critical" value={critical} color={critical > 0 ? "#DC2626" : "var(--color-normal)"} />
      </div>

      {/* Fraud chip */}
      {fraud > 0 && (
        <div style={{ padding: "0 16px 10px" }}>
          <span
            className="badge-fraud"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 3,
            }}
          >
            <AlertTriangle size={10} strokeWidth={2.5} />
            {fraud} fraud signal{fraud > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Link */}
      <Link
        to={`/team/${slug}`}
        style={{
          display: "block",
          margin: "0 16px 14px",
          padding: "6px 0",
          textAlign: "center",
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          color: "var(--color-accent)",
          border: "1px solid #C0D8E4",
          borderRadius: 4,
          textDecoration: "none",
          backgroundColor: "#F0F7FB",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#DDF0F7")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F0F7FB")}
      >
        View Queue →
      </Link>
    </div>
  );
}

function Stat({ icon, label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        {icon}
      </div>
      <span className="data-mono" style={{ fontSize: 22, fontWeight: 600, color, lineHeight: 1 }}>
        {value}
      </span>
      <span className="section-label" style={{ fontSize: 10 }}>{label}</span>
    </div>
  );
}
