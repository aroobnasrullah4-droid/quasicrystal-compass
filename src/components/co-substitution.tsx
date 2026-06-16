import { useState } from "react";

// Phase evolution for Al65Cu20Fe(15-x)Co(x)
// Source: Shaitura & Sukhanov (2007) — Co substitution in Al-Cu-Fe QC
const PHASE_DATA: {
  x: number;
  formula: string;
  Fe: number;
  Co: number;
  phase: string;
  detail: string;
  status: "pure" | "mixed" | "transition" | "lost";
}[] = [
  {
    x: 0,
    formula: "Al₆₅Cu₂₀Fe₁₅",
    Fe: 15,
    Co: 0,
    phase: "Icosahedral QC dominant",
    detail: "Baseline Al-Cu-Fe composition. Single-phase icosahedral quasicrystal with well-defined 5-fold symmetry.",
    status: "pure",
  },
  {
    x: 3,
    formula: "Al₆₅Cu₂₀Fe₁₂Co₃",
    Fe: 12,
    Co: 3,
    phase: "Icosahedral + small B2",
    detail: "Minor Co substitution. i-QC remains dominant with trace cubic β-phase (B2) precipitates.",
    status: "mixed",
  },
  {
    x: 5,
    formula: "Al₆₅Cu₂₀Fe₁₀Co₅",
    Fe: 10,
    Co: 5,
    phase: "i-QC + Decagonal + B2",
    detail: "Critical Co level. Three-phase coexistence: icosahedral QC, decagonal QC, and β-phase. Phase competition begins.",
    status: "transition",
  },
  {
    x: 8,
    formula: "Al₆₅Cu₂₀Fe₇Co₈",
    Fe: 7,
    Co: 8,
    phase: "Monolithic Decagonal",
    detail: "Co drives QC type transition. Pure decagonal quasicrystal (10-fold symmetry) — no icosahedral phase remains.",
    status: "lost",
  },
  {
    x: 15,
    formula: "Al₆₅Cu₂₀Co₁₅",
    Fe: 0,
    Co: 15,
    phase: "Decagonal only",
    detail: "Complete Fe → Co substitution. Stable decagonal QC with 10-fold rotational symmetry. i-QC is fully suppressed.",
    status: "lost",
  },
];

function statusColor(s: "pure" | "mixed" | "transition" | "lost") {
  if (s === "pure") return "#22C55E";
  if (s === "mixed") return "#F59E0B";
  if (s === "transition") return "#8B5CF6";
  return "#EF4444";
}
function statusIcon(s: "pure" | "mixed" | "transition" | "lost") {
  if (s === "pure") return "✦";
  if (s === "mixed") return "◐";
  if (s === "transition") return "⚠";
  return "✗";
}

export function CoSubstitutionPanel() {
  const [highlighted, setHighlighted] = useState<number | null>(null);

  return (
    <div
      style={{
        background: "var(--card, #fff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 14,
        padding: 18,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
          Co Substitution — Al-Cu-Fe → Al-Cu-Co
        </h3>
        <span
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(59,130,246,0.1)",
            color: "#3B82F6",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          COMPOSITION MAP
        </span>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>
        Phase evolution as Co progressively replaces Fe in Al₆₅Cu₂₀Fe₁₅₋ₓCoₓ. Based on Shaitura &amp; Sukhanov (2007).
      </p>

      {/* Phase cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
          marginBottom: 18,
        }}
      >
        {PHASE_DATA.map((step, i) => {
          const c = statusColor(step.status);
          const isCurrent = current.x === step.x;
          return (
            <div
              key={step.x}
              onMouseEnter={() => setHighlighted(i)}
              onMouseLeave={() => setHighlighted(null)}
              style={{
                position: "relative",
                border: `1px solid ${c}55`,
                background: isCurrent ? `${c}18` : `${c}10`,
                borderRadius: 10,
                padding: "10px 10px 12px",
                cursor: "default",
                transition: "transform 0.15s ease",
                transform: highlighted === i ? "translateY(-2px)" : "none",
                boxShadow: isCurrent ? `0 0 0 2px ${c}44` : "none",
              }}
            >
              {isCurrent && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: 8,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: c,
                    color: "#fff",
                  }}
                >
                  CLOSEST
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: "0.05em" }}>
                  x = {step.x}
                </span>
                <span style={{ fontSize: 14, color: c, fontWeight: 700 }}>{statusIcon(step.status)}</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 4,
                  color: "var(--foreground,#0f172a)",
                  fontFamily: "ui-monospace,monospace",
                }}
              >
                {step.formula}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)", marginTop: 2 }}>
                Fe:{step.Fe} Co:{step.Co}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, color: c, fontWeight: 600 }}>{step.phase}</div>
              <div style={{ fontSize: 10, marginTop: 4, color: "var(--muted-foreground,#64748b)", lineHeight: 1.4 }}>
                {step.detail}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annotation bar */}
      <div
        style={{
          borderTop: "1px dashed var(--border,#e2e8f0)",
          paddingTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
          <span style={{ color: "var(--muted-foreground,#64748b)" }}>Pure i-QC</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />
          <span style={{ color: "var(--muted-foreground,#64748b)" }}>Mixed phases</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8B5CF6", display: "inline-block" }} />
          <span style={{ color: "var(--muted-foreground,#64748b)" }}>Transition / competing</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444", display: "inline-block" }} />
          <span style={{ color: "var(--muted-foreground,#64748b)" }}>i-QC lost → decagonal</span>
        </div>
      </div>
    </div>
  );
}
