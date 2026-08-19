/**
 * PriorityBadge — consistent status colour coding throughout the app.
 * Uses CSS classes from the design system, not ad-hoc Tailwind utilities.
 * compact: pill in table rows  |  default: larger for ClaimDetail header
 */
export default function PriorityBadge({ criticality, compact = false }) {
  const cls = {
    CRITICAL: "badge-critical",
    URGENT:   "badge-urgent",
    NORMAL:   "badge-normal",
  }[criticality] ?? "badge-normal";

  const dotColor = {
    CRITICAL: "#DC2626",
    URGENT:   "#D97706",
    NORMAL:   "#64748B",
  }[criticality] ?? "#64748B";

  const pad = compact ? "px-2 py-0.5" : "px-2.5 py-1";
  const fontSize = compact ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-semibold tracking-wide ${cls} ${pad} ${fontSize}`}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden="true">
        <circle cx="3" cy="3" r="3" fill={dotColor} />
      </svg>
      {criticality}
    </span>
  );
}
