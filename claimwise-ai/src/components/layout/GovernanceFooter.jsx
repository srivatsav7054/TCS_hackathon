import { ShieldCheck } from "lucide-react";

/**
 * GovernanceFooter — AI governance disclaimer.
 * Subdued, professional — part of the page, not a warning banner.
 */
export default function GovernanceFooter() {
  return (
    <div
      style={{
        marginTop: 32,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        backgroundColor: "var(--color-bg)",
      }}
    >
      <ShieldCheck size={16} color="var(--color-text-muted)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        <strong style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>AI Governance</strong>
        &nbsp;&nbsp;·&nbsp;&nbsp;Human-in-the-loop
        &nbsp;&nbsp;·&nbsp;&nbsp;Explainable recommendation
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <strong style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
          AI recommendation ≠ final decision
        </strong>
      </p>
    </div>
  );
}
