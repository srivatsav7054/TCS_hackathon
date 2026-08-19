import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, Upload } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { role, team, logout } = useAuth();
  const navigate = useNavigate();

  const homeHref =
    role === "admin"
      ? "/admin"
      : team
      ? `/team/${encodeURIComponent(team)}`
      : "/";

  const handleSwitch = () => { logout(); navigate("/"); };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        height: 52,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 24px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* ── Logo ── */}
        <Link
          to={homeHref}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              backgroundColor: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ClipboardList size={15} color="#fff" strokeWidth={1.75} />
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "var(--text-base)",
              color: "var(--color-text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            ClaimWise{" "}
            <span style={{ color: "var(--color-accent)" }}>AI</span>
          </span>
        </Link>

        {/* ── Role pill ── */}
        {role && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                fontWeight: 500,
              }}
            >
              {role === "admin" ? "Admin — All Teams" : team}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: role === "admin" ? "var(--color-primary)" : "var(--color-accent)",
                backgroundColor:
                  role === "admin" ? "rgba(30,58,95,0.08)" : "rgba(44,110,140,0.10)",
                padding: "2px 7px",
                borderRadius: 3,
                border: `1px solid ${role === "admin" ? "rgba(30,58,95,0.18)" : "rgba(44,110,140,0.20)"}`,
              }}
            >
              {role === "admin" ? "Admin" : "Handler"}
            </span>
          </div>
        )}

        {/* ── Right controls ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {role && (
            <Link
              to="/upload"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: "var(--text-xs)",
                color: "var(--color-accent)",
                textDecoration: "none",
                backgroundColor: "rgba(44,110,140,0.09)",
                border: "1px solid rgba(44,110,140,0.22)",
                padding: "5px 10px",
                borderRadius: 4,
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(44,110,140,0.16)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(44,110,140,0.09)")}
            >
              <Upload size={13} strokeWidth={2.5} />
              Upload Claim
            </Link>
          )}
          {role && <NotificationBell />}
          <button className="btn-ghost" onClick={handleSwitch}>
            Switch Role
          </button>
        </div>
      </div>
    </header>
  );
}
