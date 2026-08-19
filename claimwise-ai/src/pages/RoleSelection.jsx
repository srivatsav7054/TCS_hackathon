import { useNavigate } from "react-router-dom";
import { ClipboardList, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { TEAMS } from "../data/mockClaims";

const TEAM_META = {
  "Motor Claims":          { abbr: "MC",  desc: "Vehicle & third-party claims" },
  "Health Claims":         { abbr: "HC",  desc: "Hospitalisation & OPD" },
  "Property Claims":       { abbr: "PC",  desc: "Fire, flood & burglary" },
  "Life Claims":           { abbr: "LC",  desc: "Term life & critical illness" },
  "Fraud Investigation":   { abbr: "FI",  desc: "Escalated fraud signals" },
  "Senior/Complex Review": { abbr: "SCR", desc: "Multi-line & complex cases" },
};

export default function RoleSelection() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleAdmin = () => { login("admin", null); navigate("/admin"); };
  const handleTeam  = (t) => { login("handler", t); navigate(`/team/${encodeURIComponent(t)}`); };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F1C2E",          /* deep navy — intentionally distinct from page bg */
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* ── Wordmark ── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 10,
              backgroundColor: "var(--color-accent)",
              marginBottom: 16,
            }}
          >
            <ClipboardList size={24} color="#fff" strokeWidth={1.75} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 28,
              color: "#F0F4F8",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            ClaimWise <span style={{ color: "#5BA8C4" }}>AI</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "#8C9BAA",
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Insurance Claims Triage Dashboard
          </p>
        </div>

        {/* ── Card ── */}
        <div
          style={{
            backgroundColor: "#162333",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Admin button */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={handleAdmin}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                backgroundColor: "var(--color-primary)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#162e4d")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary)")}
            >
              <div style={{ textAlign: "left" }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "var(--text-base)",
                    color: "#F0F4F8",
                  }}
                >
                  Admin / Master View
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    color: "#8AABCA",
                  }}
                >
                  All teams · Cross-team analytics · Claim reassignment
                </p>
              </div>
              <ChevronRight size={18} color="#8AABCA" />
            </button>
          </div>

          {/* Team grid */}
          <div style={{ padding: "20px 24px" }}>
            <p
              style={{
                margin: "0 0 14px",
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "#5B7084",
              }}
            >
              Team Handler Login
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {TEAMS.map((team) => {
                const meta = TEAM_META[team] ?? { abbr: "?", desc: "" };
                return (
                  <button
                    key={team}
                    onClick={() => handleTeam(team)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 14px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 5,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background-color 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(44,110,140,0.18)";
                      e.currentTarget.style.borderColor = "rgba(44,110,140,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    <span
                      className="data-mono"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#5BA8C4",
                        backgroundColor: "rgba(44,110,140,0.18)",
                        padding: "3px 6px",
                        borderRadius: 3,
                        flexShrink: 0,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {meta.abbr}
                    </span>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-sans)",
                          fontWeight: 600,
                          fontSize: "var(--text-sm)",
                          color: "#D0DCE8",
                          lineHeight: 1.3,
                        }}
                      >
                        {team}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          color: "#5B7084",
                          lineHeight: 1.2,
                        }}
                      >
                        {meta.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "#3D5166",
          }}
        >
          Demo environment — no authentication required
        </p>
      </div>
    </div>
  );
}
