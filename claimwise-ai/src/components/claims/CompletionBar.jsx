/**
 * CompletionBar — documentation completeness progress bar.
 * compact: minimal inline bar for queue rows.
 * Uses design-system colors; IBM Plex Mono for numbers.
 */
export default function CompletionBar({ completion, submitted, required, compact = false }) {
  const pct = Math.min(100, Math.max(0, completion ?? 0));
  const subCount = submitted?.length ?? 0;
  const reqCount = required?.length ?? subCount;

  const trackColor = "#E2E5EA";
  const fillColor =
    pct < 50 ? "#DC2626" :
    pct < 80 ? "#D97706" :
    "#16A34A";

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}>
        <div style={{ flex: 1, height: 3, background: trackColor, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: fillColor, borderRadius: 2 }} />
        </div>
        <span
          className="data-mono"
          style={{ fontSize: 11, color: fillColor, fontWeight: 600, minWidth: 28, textAlign: "right" }}
        >
          {pct}%
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="section-label">Documentation</span>
        <span
          className="data-mono"
          style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}
        >
          {subCount}/{reqCount} docs · {pct}%
        </span>
      </div>
      <div style={{ width: "100%", height: 5, background: trackColor, borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: fillColor,
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}
