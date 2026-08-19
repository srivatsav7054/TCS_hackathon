import { AlertTriangle } from "lucide-react";

/**
 * FraudAlert — #9F1239 deep-rose, categorically distinct from criticality red.
 * Uses lucide icon, not emoji. Shown FIRST on ClaimDetail.
 */
export default function FraudAlert({ indicators = [] }) {
  return (
    <div
      style={{
        marginBottom: 20,
        borderRadius: 6,
        border: "1px solid #F9A8BC",
        backgroundColor: "#FFF1F2",
        overflow: "hidden",
      }}
    >
      {/* Header strip */}
      <div
        style={{
          backgroundColor: "#9F1239",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <AlertTriangle size={15} color="#FECDD3" strokeWidth={2.5} />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "var(--text-xs)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#FECDD3",
          }}
        >
          Fraud Signal Detected — Do Not Settle Without Investigation
        </span>
      </div>

      {/* Indicators */}
      {indicators.length > 0 && (
        <ul style={{ margin: 0, padding: "12px 16px", listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {indicators.map((ind, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "#881337",
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: "#9F1239",
                  marginTop: 7,
                  flexShrink: 0,
                }}
              />
              {ind}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
