/**
 * KPICard — admin dashboard stat card.
 * 1px hairline border, no heavy shadow, accent color for value.
 * accentColor is an exact CSS color string from the brand palette.
 */
export default function KPICard({ label, value, sub, accentColor = "#1E3A5F" }) {
  return (
    <div
      className="card card-hover"
      style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6 }}
    >
      <span className="section-label">{label}</span>
      <span
        className="data-mono"
        style={{
          fontSize: 36,
          fontWeight: 600,
          lineHeight: 1,
          color: accentColor,
          marginTop: 2,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            marginTop: 2,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
