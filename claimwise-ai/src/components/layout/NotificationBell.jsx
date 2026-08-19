import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertTriangle, Clock, FileX, ShieldAlert } from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";

const SEVERITY_ICON = {
  critical: <AlertTriangle size={13} color="#DC2626" strokeWidth={2.5} />,
  fraud:    <ShieldAlert   size={13} color="#9F1239" strokeWidth={2.5} />,
  sla:      <Clock         size={13} color="#D97706" strokeWidth={2.5} />,
  docs:     <FileX         size={13} color="#2C6E8C" strokeWidth={2.5} />,
};

const SEVERITY_COLOR = {
  critical: "#DC2626",
  fraud:    "#9F1239",
  sla:      "#D97706",
  docs:     "#2C6E8C",
};

export default function NotificationBell() {
  const notifications = useNotifications();
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);
  const navigate          = useNavigate();
  const count             = notifications.length;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`${count} notifications`}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 6,
          border: "1px solid var(--color-border)",
          backgroundColor: open ? "var(--color-bg)" : "transparent",
          cursor: "pointer",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <Bell size={16} color="var(--color-text-secondary)" strokeWidth={1.75} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: "#DC2626",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            zIndex: 50,
            width: 320,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(30, 58, 95, 0.10)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span className="section-label">Notifications</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--color-text-muted)",
              }}
            >
              {count} active
            </span>
          </div>

          {count === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
              No notifications
            </div>
          ) : (
            <ul
              style={{
                maxHeight: 280,
                overflowY: "auto",
                margin: 0,
                padding: 0,
                listStyle: "none",
              }}
            >
              {notifications.map((n) => (
                <li key={n.id} style={{ borderBottom: "1px solid var(--color-bg)" }}>
                  <button
                    onClick={() => { navigate(`/claim/${n.claimId}`); setOpen(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 14px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background-color 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ marginTop: 1, flexShrink: 0 }}>
                      {SEVERITY_ICON[n.severity]}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        lineHeight: 1.5,
                        color: SEVERITY_COLOR[n.severity] ?? "var(--color-text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      {n.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
