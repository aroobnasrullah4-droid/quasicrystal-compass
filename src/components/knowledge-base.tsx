import { useMemo, useState } from "react";
import { QC_KNOWLEDGE } from "@/data/qc-knowledge";

const TAG_COLORS: Record<string, string> = {
  CONCEPT: "#0EA5E9",
  STRUCTURE: "#8B5CF6",
  DATASET: "#22C55E",
  PREDICTOR: "#F59E0B",
  PROCESS: "#EC4899",
  "TIME-SERIES": "#EF4444",
  PROPERTIES: "#14B8A6",
  XRD: "#6366F1",
};

export function KnowledgeBasePanel() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QC_KNOWLEDGE;
    return QC_KNOWLEDGE.filter(
      (k) =>
        k.title.toLowerCase().includes(q) ||
        k.summary.toLowerCase().includes(q) ||
        k.body.toLowerCase().includes(q) ||
        k.tag.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div
      style={{
        background: "var(--card,#fff)",
        border: "1px solid var(--border,#e2e8f0)",
        borderRadius: 14,
        padding: 18,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground,#0f172a)" }}>
          QC Knowledge Base — RAG Grounding
        </h3>
        <span
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(99,102,241,0.12)",
            color: "#6366F1",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {QC_KNOWLEDGE.length} CHUNKS
        </span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted-foreground,#64748b)" }}>
        Self-contained knowledge chunks (Shechtman 1984; Tsai; Cahn-Shechtman-Gratias indexing;
        Mukhopadhyay &amp; Yadav 2022 review; AlCuFeB MA study). Auto-injected into AI Analysis
        as RAG context.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search chunks (e.g. 'e/a', 'milling', 'Cd-Yb', 'XRD')..."
        style={{
          width: "100%",
          padding: "8px 10px",
          fontSize: 12,
          borderRadius: 8,
          border: "1px solid var(--border,#e2e8f0)",
          background: "var(--background,#fff)",
          color: "var(--foreground,#0f172a)",
          marginBottom: 12,
          fontFamily: "inherit",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((k) => {
          const open = openId === k.id;
          const color = TAG_COLORS[k.tag] ?? "#64748B";
          return (
            <div
              key={k.id}
              style={{
                border: `1px solid ${open ? color + "55" : "var(--border,#e2e8f0)"}`,
                borderRadius: 10,
                background: open ? color + "08" : "var(--card,#fff)",
                overflow: "hidden",
                transition: "all 0.15s ease",
              }}
            >
              <button
                onClick={() => setOpenId(open ? null : k.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color,
                    background: color + "15",
                    padding: "2px 6px",
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  #{k.id} {k.tag}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--foreground,#0f172a)" }}>
                  {k.title}
                </span>
                <span style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)" }}>{open ? "−" : "+"}</span>
              </button>
              {!open && (
                <div style={{ padding: "0 12px 10px", fontSize: 11, color: "var(--muted-foreground,#64748b)" }}>
                  {k.summary}
                </div>
              )}
              {open && (
                <div
                  style={{
                    padding: "0 12px 12px",
                    fontSize: 11.5,
                    lineHeight: 1.55,
                    color: "var(--foreground,#0f172a)",
                    whiteSpace: "pre-wrap",
                    fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
                  }}
                >
                  {k.body}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--muted-foreground,#64748b)", padding: 12, textAlign: "center" }}>
            No chunks match "{query}".
          </div>
        )}
      </div>
    </div>
  );
}
