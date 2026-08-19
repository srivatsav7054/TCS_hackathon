import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert,
  ChevronRight, FileText, Info
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import PriorityBadge from "./PriorityBadge";
import FraudAlert from "./FraudAlert";

export default function AISummaryPanel({ claimId, isOpen, onClose, claims = [] }) {
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);

  useEffect(() => {
    if (claimId && claims.length > 0) {
      const c = claims.find(x => x.claim_id === claimId);
      setClaim(c);
    }
  }, [claimId, claims]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen || !claim) return null;

  // Derived radar data for the AI assessment
  const radarData = [
    { subject: "Complexity", val: claim.complexity === "HIGH" ? 90 : claim.complexity === "MEDIUM" ? 60 : 30 },
    { subject: "Urgency",    val: claim.criticality === "CRITICAL" ? 95 : claim.criticality === "URGENT" ? 70 : 40 },
    { subject: "Fraud Risk", val: claim.fraud_flag ? 90 : 20 },
    { subject: "Completeness", val: claim.completion_percentage },
    { subject: "Cost Impact", val: Math.min(100, Math.round((claim.claim_amount / 50000) * 100)) },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.15)",
          zIndex: 100,
          animation: "fadeIn 0.2s ease-out forwards",
        }}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "100%", maxWidth: 460,
          backgroundColor: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          boxShadow: "none",
          transform: "translateX(100%)",
          animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        {/* ── Header ── */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", backgroundColor: "var(--color-surface)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Sparkles size={16} color="var(--color-accent)" strokeWidth={2.5} />
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                AI Triage Summary
              </h2>
            </div>
            <p className="data-mono" style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>
              {claim.claim_id} · {claim.claim_type}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", padding: 6, cursor: "pointer",
              color: "var(--color-text-muted)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Metadata Grid (Background Tone: F7F8FA) */}
          <div style={{ backgroundColor: "var(--color-bg)", borderRadius: 6, padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 12px" }}>
            <MetaItem label="Claimed Amount" value={fmtAmt(claim.claim_amount)} mono />
            <MetaItem label="Assigned Team" value={claim.assigned_team} />
            <MetaItem label="Complexity" value={claim.complexity} />
            <MetaItem label="SLA Remaining" value={claim.hours_remaining != null ? `${claim.hours_remaining}h` : "—"} mono />
          </div>

          {claim.fraud_flag && <FraudAlert indicators={claim.fraud_indicators} />}

          {/* AI Findings Section (Background Tone: White) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Risk Radar Chart */}
            <div style={{ backgroundColor: "var(--color-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="section-label">AI Risk Assessment</span>
                <span className="data-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)" }}>
                  Score: {claim.priority_score}
                </span>
              </div>
              <div style={{ height: 220, margin: "0 -20px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <defs>
                      <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.05} />
                      </linearGradient>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="var(--color-primary)" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <PolarGrid stroke="#E2E5EA" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--color-text-secondary)", fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500 }} />
                    <Radar
                      name="Claim"
                      dataKey="val"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      fill="url(#radarFill)"
                      fillOpacity={1}
                      style={{ filter: "url(#shadow)" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Reasoning */}
            <div style={{ backgroundColor: "var(--color-surface)" }}>
              <span className="section-label" style={{ display: "block", marginBottom: 8 }}>AI Reasoning</span>
              <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                {claim.reasoning || claim.current_state_summary}
              </p>
            </div>

            {/* Next Best Actions */}
            <div style={{ backgroundColor: "var(--color-surface)" }}>
              <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Recommended Actions</span>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {claim.next_best_action.map((action, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--color-accent)", marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)" }}>
          <button
            className="btn-ghost"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "var(--color-surface)" }}
            onClick={() => { onClose(); navigate(`/claim/${claim.claim_id}`); }}
          >
            <FileText size={16} />
            Full Claim Details
          </button>
        </div>
      </div>
    </>
  );
}

function MetaItem({ label, value, mono }) {
  return (
    <div>
      <p style={{ margin: "0 0 2px", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className={mono ? "data-mono" : ""} style={{ margin: 0, fontSize: mono ? 15 : "var(--text-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

function fmtAmt(n) {
  if (!n && n !== 0) return "—";
  if (n === 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
