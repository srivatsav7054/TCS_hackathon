import { createContext, useContext, useMemo } from "react";

const NotificationsContext = createContext([]);

/**
 * Derives notifications from a list of role-scoped claims.
 * No persistence — recomputed every time claims change.
 */
export function deriveNotifications(claims) {
  const items = [];
  for (const c of claims) {
    if (c.criticality === "CRITICAL") {
      items.push({
        id: `critical-${c.claim_id}`,
        icon: "🔴",
        message: `Critical claim needs review: ${c.claim_id}`,
        claimId: c.claim_id,
        severity: "critical",
      });
    }
    if (c.fraud_flag) {
      items.push({
        id: `fraud-${c.claim_id}`,
        icon: "🚨",
        message: `Fraud signal detected on ${c.claim_id}`,
        claimId: c.claim_id,
        severity: "fraud",
      });
    }
    if (typeof c.hours_remaining === "number" && c.hours_remaining < 6) {
      items.push({
        id: `sla-${c.claim_id}`,
        icon: "⏱",
        message: `SLA risk on ${c.claim_id} — ${c.hours_remaining}h remaining`,
        claimId: c.claim_id,
        severity: "sla",
      });
    }
    if (typeof c.completion_percentage === "number" && c.completion_percentage < 50) {
      items.push({
        id: `docs-${c.claim_id}`,
        icon: "📄",
        message: `${c.claim_id} only ${c.completion_percentage}% documented`,
        claimId: c.claim_id,
        severity: "docs",
      });
    }
  }
  return items;
}

export function NotificationsProvider({ claims, children }) {
  const notifications = useMemo(() => deriveNotifications(claims), [claims]);
  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
