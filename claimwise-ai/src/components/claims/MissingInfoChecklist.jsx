import { CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";

/**
 * MissingInfoChecklist — two labeled sections: documents and fields.
 * Metadata background (#F7F8FA) vs. white surface differentiates info types.
 * Uses lucide icons, IBM Plex Mono for doc labels.
 */
export default function MissingInfoChecklist({
  missingDocuments = [],
  missingFields = [],
  submittedDocuments = [],
  requiredDocuments = [],
  documentUrls = {},
}) {
  const allDocs =
    requiredDocuments.length > 0
      ? requiredDocuments
      : [...submittedDocuments, ...missingDocuments];

  const norm = (s) => s.toLowerCase().replace(/[_\s-]/g, " ").trim();
  const missingNorm = missingDocuments.map(norm);

  const docItems = allDocs.map((doc) => {
    const isMissing = missingNorm.includes(norm(doc));
    
    // Attempt to match the URL from documentUrls (exact, lowercase, or normalized match)
    let url = null;
    if (!isMissing && documentUrls) {
      url = documentUrls[doc] 
         || documentUrls[doc.toLowerCase()]
         || Object.entries(documentUrls).find(([k]) => norm(k) === norm(doc))?.[1];
    }
    
    return {
      label: fmtLabel(doc),
      missing: isMissing,
      url,
    };
  });

  const fieldItems = missingFields.map((f) => ({ label: fmtLabel(f) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Documents section — on page-bg to differentiate from card white ── */}
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          borderRadius: 6,
          padding: "12px 14px",
          border: "1px solid var(--color-border)",
        }}
      >
        <p className="section-label" style={{ marginBottom: 10 }}>Required Documents</p>
        {docItems.length === 0 ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
            No document requirements defined.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {docItems.map(({ label, missing, url }) => (
              <li
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: missing ? "var(--color-critical)" : "var(--color-text-secondary)",
                  textDecoration: !missing ? "line-through" : "none",
                  textDecorationColor: "#9CA3AF",
                }}
              >
                {missing ? (
                  <XCircle size={14} color="#DC2626" strokeWidth={2} style={{ flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={14} color="#16A34A" strokeWidth={2} style={{ flexShrink: 0 }} />
                )}
                <span style={{ flex: 1 }}>{label}</span>
                
                {!missing && url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--color-accent)",
                      textDecoration: "none",
                      fontSize: 11,
                      fontFamily: "var(--font-sans)",
                      fontWeight: 500,
                      backgroundColor: "rgba(44,110,140,0.06)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(44,110,140,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(44,110,140,0.06)")}
                  >
                    View
                    <ExternalLink size={11} strokeWidth={2} />
                  </a>
                )}
                
                {missing && (
                  <span
                    className="badge-critical"
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-sans)",
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  >
                    Missing
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Missing fields section — white surface ── */}
      {fieldItems.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: 6,
            padding: "12px 14px",
            border: "1px solid var(--color-urgent-border)",
          }}
        >
          <p className="section-label" style={{ marginBottom: 10, color: "var(--color-urgent)" }}>
            Missing Information Fields
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {fieldItems.map(({ label }) => (
              <li
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <AlertCircle size={14} color="#D97706" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "#92400E",
                    flex: 1,
                  }}
                >
                  {label}
                </span>
                <span
                  className="badge-urgent"
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
                >
                  Required
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {docItems.length > 0 && fieldItems.length === 0 && missingDocuments.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={14} color="#16A34A" strokeWidth={2} />
          <span style={{ fontSize: "var(--text-sm)", color: "#15803D", fontWeight: 500 }}>
            All documents and fields complete
          </span>
        </div>
      )}
    </div>
  );
}

function fmtLabel(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
