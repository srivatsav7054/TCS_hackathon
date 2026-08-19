import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader } from "lucide-react";
import { uploadClaim, uploadAdditionalDocuments, MOCK_MODE } from "../api/claimsApi";
import Navbar from "../components/layout/Navbar";
import GovernanceFooter from "../components/layout/GovernanceFooter";
import { useAuth } from "../context/AuthContext";
import { NotificationsProvider } from "../context/NotificationsContext";

const STEPS = [
  { id: "extract",  label: "Extracting text from PDFs" },
  { id: "classify", label: "Classifying document types" },
  { id: "triage",   label: "Running AI triage engine" },
  { id: "score",    label: "Scoring priority & risk" },
];

export default function UploadClaim() {
  const navigate        = useNavigate();
  const { role }        = useAuth();
  const inputRef        = useRef(null);

  const [files, setFiles]       = useState([]);   // File[]
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus]     = useState("idle"); // idle | loading | error | done
  const [step, setStep]         = useState(0);
  const [error, setError]       = useState(null);
  
  // New feature: scan by claim ID
  const [mode, setMode]         = useState("new"); // "new" | "existing"
  const [claimId, setClaimId]   = useState("");

  // ── File helpers ──────────────────────────────────────────────
  const addFiles = (incoming) => {
    const pdfs = [...incoming].filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...pdfs.filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  // ── Drag handlers ─────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (files.length === 0) return;
    if (mode === "existing" && !claimId.trim()) {
      setError("Please enter a valid Claim ID.");
      setStatus("error");
      return;
    }
    
    setStatus("loading");
    setStep(0);
    setError(null);

    // Advance visual step indicator every ~600ms while the real call runs
    const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 600);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      
      let result;
      if (mode === "existing") {
        result = await uploadAdditionalDocuments(claimId.trim(), formData);
      } else {
        result = await uploadClaim(formData);
      }
      
      clearInterval(ticker);
      setStatus("done");
      // Brief pause so user sees completion, then navigate
      setTimeout(() => navigate(`/claim/${result.claim_id}`), 900);
    } catch (err) {
      clearInterval(ticker);
      setStatus("error");
      setError(err.message);
    }
  };

  return (
    <NotificationsProvider claims={[]}>
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
        <Navbar />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 48px" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--color-text-primary)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              Upload Claim Documents
            </h1>
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
              Upload all PDFs for one claim — form, policy, supporting documents.
              The AI pipeline will extract, classify, and triage automatically.
            </p>
            {MOCK_MODE && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600, color: "#D97706", backgroundColor: "rgba(217,119,6,0.09)", border: "1px solid rgba(217,119,6,0.22)", padding: "2px 8px", borderRadius: 3 }}>
                MOCK MODE — set MOCK_MODE = false in claimsApi.js to use the real backend
              </span>
            )}
          </div>

          {/* ── Drop zone ── */}
          {status === "idle" || status === "error" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              {/* Mode Selection */}
              <div style={{ display: "flex", gap: 10, padding: 4, backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }}>
                <button
                  onClick={() => setMode("new")}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    borderRadius: 5,
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    backgroundColor: mode === "new" ? "rgba(44,110,140,0.08)" : "transparent",
                    color: mode === "new" ? "var(--color-accent)" : "var(--color-text-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  New Claim
                </button>
                <button
                  onClick={() => setMode("existing")}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    borderRadius: 5,
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    backgroundColor: mode === "existing" ? "rgba(44,110,140,0.08)" : "transparent",
                    color: mode === "existing" ? "var(--color-accent)" : "var(--color-text-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  Add to Existing Claim
                </button>
              </div>

              {/* Claim ID Input (for existing mode) */}
              {mode === "existing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="claimId" className="section-label">Target Claim ID</label>
                  <input
                    id="claimId"
                    type="text"
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                    placeholder="e.g. CLM9182"
                    style={{
                      padding: "10px 14px",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6,
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "var(--color-accent)" : "var(--color-border)"}`,
                  borderRadius: 8,
                  padding: "40px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  cursor: "pointer",
                  backgroundColor: dragOver ? "rgba(44,110,140,0.04)" : "var(--color-surface)",
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                }}
              >
                <Upload size={32} color={dragOver ? "var(--color-accent)" : "var(--color-text-muted)"} strokeWidth={1.5} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
                    Drop PDFs here or <span style={{ color: "var(--color-accent)" }}>browse</span>
                  </p>
                  <p style={{ margin: "4px 0 0", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    PDF files only · Multiple files allowed · All files treated as one claim batch
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="section-label">{files.length} file{files.length > 1 ? "s" : ""} selected</span>
                    <button
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}
                      onClick={() => setFiles([])}
                    >
                      Clear all
                    </button>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {files.map((f) => (
                      <li
                        key={f.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 14px",
                          borderBottom: "1px solid var(--color-bg)",
                        }}
                      >
                        <FileText size={14} color="var(--color-accent)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                        <span className="data-mono" style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </span>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-muted)" }}
                        >
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error state */}
              {status === "error" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, backgroundColor: "var(--color-critical-bg)", border: "1px solid var(--color-critical-border)", borderRadius: 6, padding: "12px 14px" }}>
                  <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "var(--text-sm)", color: "#DC2626" }}>Upload failed</p>
                    <p style={{ margin: "2px 0 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "#B91C1C" }}>{error}</p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={files.length === 0}
                style={{
                  backgroundColor: files.length === 0 ? "#C8CDD6" : "var(--color-primary)",
                  color: "#fff",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  padding: "11px 0",
                  borderRadius: 5,
                  border: "none",
                  cursor: files.length === 0 ? "not-allowed" : "pointer",
                  transition: "background-color 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => { if (files.length > 0) e.currentTarget.style.backgroundColor = "#162e4d"; }}
                onMouseLeave={(e) => { if (files.length > 0) e.currentTarget.style.backgroundColor = "var(--color-primary)"; }}
              >
                <Upload size={16} />
                Submit {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} for Triage` : "Claim"}
              </button>
            </div>
          ) : null}

          {/* ── Loading state ── */}
          {status === "loading" && (
            <div className="card" style={{ padding: "36px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              <Loader size={32} color="var(--color-accent)" strokeWidth={1.75} style={{ animation: "spin 1s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>
                  Processing with AI…
                </p>
                <p style={{ margin: "4px 0 0", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                  This may take a few seconds depending on file count and size.
                </p>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10 }}>
                {STEPS.map((s, i) => {
                  const done    = i < step;
                  const active  = i === step;
                  return (
                    <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {done ? (
                        <CheckCircle2 size={16} color="#16A34A" strokeWidth={2} style={{ flexShrink: 0 }} />
                      ) : active ? (
                        <Loader size={16} color="var(--color-accent)" strokeWidth={2} style={{ flexShrink: 0, animation: "spin 1s linear infinite" }} />
                      ) : (
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid var(--color-border)", flexShrink: 0 }} />
                      )}
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: active ? "var(--color-text-primary)" : done ? "#16A34A" : "var(--color-text-muted)", fontWeight: active ? 600 : 400 }}>
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── Done flash ── */}
          {status === "done" && (
            <div className="card" style={{ padding: "36px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <CheckCircle2 size={36} color="#16A34A" strokeWidth={1.75} />
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>
                Triage complete — redirecting…
              </p>
            </div>
          )}

          <GovernanceFooter />
        </main>
      </div>
    </NotificationsProvider>
  );
}
