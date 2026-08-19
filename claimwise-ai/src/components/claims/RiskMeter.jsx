/**
 * RiskMeter — SVG arc gauge (full) or thin bar (compact).
 * Color thresholds: ≥75 critical red, ≥50 urgent amber, <50 green.
 * No emoji, no heavy shadows — uses exact brand palette.
 */
export default function RiskMeter({ score, compact = false }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));

  // Exact brand palette values
  const color =
    pct >= 75 ? "#DC2626" :
    pct >= 50 ? "#D97706" :
    "#16A34A";

  const label =
    pct >= 75 ? "High" :
    pct >= 50 ? "Medium" :
    "Low";

  // ── Compact: thin horizontal bar + number ──────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-2" style={{ minWidth: 100 }}>
        <div
          style={{
            flex: 1,
            height: 4,
            background: "#E2E5EA",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: color,
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <span
          className="data-mono text-xs font-semibold"
          style={{ color, minWidth: 24, textAlign: "right" }}
        >
          {score}
        </span>
      </div>
    );
  }

  // ── Full: SVG arc gauge ────────────────────────────────────────
  const R = 40, cx = 52, cy = 52;
  const START = -220, SWEEP = 260;
  const endAngle = START + (pct / 100) * SWEEP;

  const arc = (a1, a2) => {
    const r = (d) => (d * Math.PI) / 180;
    const x1 = cx + R * Math.cos(r(a1)), y1 = cy + R * Math.sin(r(a1));
    const x2 = cx + R * Math.cos(r(a2)), y2 = cy + R * Math.sin(r(a2));
    return `M ${x1} ${y1} A ${R} ${R} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg width="104" height="76" viewBox="0 0 104 76">
        {/* Track */}
        <path
          d={arc(START, START + SWEEP)}
          fill="none"
          stroke="#E2E5EA"
          strokeWidth={7}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={arc(START, endAngle)}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
          />
        )}
        {/* Score number */}
        <text
          x={cx} y={cy + 6}
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fontFamily="IBM Plex Mono"
          fill={color}
        >
          {score}
        </text>
        {/* RISK label */}
        <text
          x={cx} y={cy + 20}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="600"
          fontFamily="Inter"
          letterSpacing="0.08em"
          fill="#8C95A0"
        >
          RISK
        </text>
      </svg>
      <span
        className="text-xs font-semibold"
        style={{ color, fontFamily: "var(--font-sans)", marginTop: -4 }}
      >
        {label} Risk
      </span>
    </div>
  );
}
