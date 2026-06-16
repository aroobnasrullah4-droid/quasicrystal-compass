import { useMemo, useState } from "react";

type ElKey = "Al" | "Cu" | "Fe" | "Mn";
type Comp = Record<ElKey, number>;

interface Props {
  comp: Comp;
  predKind: "QC" | "APPROX" | "ORDINARY" | "INVALID";
}

// Phase evolution sequence for Al-Cu-Fe (Tsai-type) system.
// Source: Tsai et al. (1987); Bancel (1991); Faudot et al. (1991).
const TIMELINE: {
  id: string;
  label: string;
  temp: string;
  time: string;
  phase: string;
  detail: string;
  status: "mixed" | "pure" | "lost";
}[] = [
  {
    id: "ascast",
    label: "As-cast",
    temp: "rapid solidification",
    time: "—",
    phase: "β (cubic B2) + i-QC",
    detail: "Metastable mix: β-phase (CsCl-type) coexists with icosahedral quasicrystal nuclei.",
    status: "mixed",
  },
  {
    id: "850",
    label: "Annealed",
    temp: "850 °C",
    time: "short",
    phase: "β ↓ + i-QC ↑",
    detail: "β-phase fraction decreases; icosahedral QC grows but mixture persists.",
    status: "mixed",
  },
  {
    id: "700",
    label: "Annealed",
    temp: "700 °C",
    time: "72 h",
    phase: "Pure icosahedral QC",
    detail: "Thermodynamic equilibrium reached — single-phase i-QC. Optimal heat-treatment window.",
    status: "pure",
  },
  {
    id: "900",
    label: "Annealed",
    temp: "900 °C",
    time: "—",
    phase: "β returns, QC lost",
    detail: "Above the QC stability ceiling — i-QC decomposes back to high-temperature β-phase.",
    status: "lost",
  },
];

function statusColor(s: "mixed" | "pure" | "lost") {
  if (s === "pure") return "#22C55E";
  if (s === "mixed") return "#F59E0B";
  return "#EF4444";
}
function statusIcon(s: "mixed" | "pure" | "lost") {
  if (s === "pure") return "✓";
  if (s === "mixed") return "◐";
  return "✗";
}

// Simulator: predict phase given current composition + (T, t).
// Heuristic mapped to the AlCuFe phase evolution evidence.
function simulate(comp: Comp, predKind: Props["predKind"], T: number, hours: number) {
  // If composition itself isn't in the QC field, heat treatment can't recover it.
  if (predKind === "ORDINARY" || predKind === "INVALID") {
    return {
      phase: "Ordinary / multi-phase",
      detail: "Composition lies outside the QC phase field — annealing cannot induce i-QC formation.",
      color: "#EF4444",
      icon: "✗",
    };
  }

  // As-cast region (no annealing)
  if (hours < 0.5) {
    return {
      phase: "β (B2) + i-QC (metastable mix)",
      detail: "As-cast / rapid solidification — metastable mixture of β-phase and icosahedral nuclei.",
      color: "#F59E0B",
      icon: "◐",
    };
  }

  // Above QC ceiling — QC decomposes
  if (T >= 880) {
    return {
      phase: "β-phase dominant — QC lost",
      detail: `T = ${T} °C exceeds the i-QC stability ceiling (~880 °C). Quasicrystal decomposes back to high-T β-phase.`,
      color: "#EF4444",
      icon: "✗",
    };
  }

  // Optimal window: 650–780 °C with sufficient time
  if (T >= 650 && T <= 780 && hours >= 24) {
    return {
      phase: "Pure icosahedral QC",
      detail: `T = ${T} °C, t = ${hours} h — within equilibrium window. Single-phase i-QC expected.${
        predKind === "APPROX" ? " Borderline composition — yield may be reduced." : ""
      }`,
      color: "#22C55E",
      icon: "✓",
    };
  }

  // Intermediate: 780–880 °C or short annealing — mixed
  return {
    phase: "β ↓ + i-QC ↑ (still mixed)",
    detail: `T = ${T} °C, t = ${hours} h — partial transformation. β-phase fraction decreasing, i-QC growing. Increase time or lower T toward 700 °C for single-phase.`,
    color: "#F59E0B",
    icon: "◐",
  };
}

export function HeatTreatmentPanel({ comp, predKind }: Props) {
  const [T, setT] = useState(700);
  const [hours, setHours] = useState(72);

  const result = useMemo(() => simulate(comp, predKind, T, hours), [comp, predKind, T, hours]);

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
          Heat Treatment & Phase Evolution
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
          Al-Cu-Fe SYSTEM
        </span>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>
        Evolution of phase content with annealing temperature and time. Based on Tsai et al. (1987), Bancel (1991),
        Faudot et al. (1991).
      </p>

      {/* TIMELINE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 18,
        }}
      >
        {TIMELINE.map((step, i) => {
          const c = statusColor(step.status);
          return (
            <div
              key={step.id}
              style={{
                position: "relative",
                border: `1px solid ${c}55`,
                background: `${c}10`,
                borderRadius: 10,
                padding: "10px 10px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: "0.05em" }}>
                  STEP {i + 1}
                </span>
                <span style={{ fontSize: 14, color: c, fontWeight: 700 }}>{statusIcon(step.status)}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: "var(--foreground,#0f172a)" }}>
                {step.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground,#64748b)", fontFamily: "ui-monospace,monospace" }}>
                {step.temp} {step.time !== "—" ? `· ${step.time}` : ""}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, color: c, fontWeight: 600 }}>{step.phase}</div>
              <div style={{ fontSize: 10, marginTop: 4, color: "var(--muted-foreground,#64748b)", lineHeight: 1.4 }}>
                {step.detail}
              </div>
            </div>
          );
        })}
      </div>

      {/* SIMULATOR */}
      <div
        style={{
          borderTop: "1px dashed var(--border,#e2e8f0)",
          paddingTop: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <strong style={{ fontSize: 13, color: "var(--foreground,#0f172a)" }}>Annealing Simulator</strong>
          <span style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)" }}>
            Uses current composition · heuristic model
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "var(--muted-foreground,#64748b)" }}>
            Temperature: <strong style={{ color: "var(--foreground,#0f172a)" }}>{T} °C</strong>
            <input
              type="range"
              min={400}
              max={1000}
              step={10}
              value={T}
              onChange={(e) => setT(+e.target.value)}
              style={{ width: "100%", marginTop: 4, accentColor: "#3B82F6" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 2 }}>
              <span>400</span><span style={{ color: "#22C55E" }}>700 (opt)</span><span style={{ color: "#EF4444" }}>880+</span><span>1000</span>
            </div>
          </label>

          <label style={{ fontSize: 11, color: "var(--muted-foreground,#64748b)" }}>
            Time: <strong style={{ color: "var(--foreground,#0f172a)" }}>{hours} h</strong>
            <input
              type="range"
              min={0}
              max={168}
              step={1}
              value={hours}
              onChange={(e) => setHours(+e.target.value)}
              style={{ width: "100%", marginTop: 4, accentColor: "#3B82F6" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 2 }}>
              <span>0 (as-cast)</span><span>72 h</span><span>168 h</span>
            </div>
          </label>
        </div>

        <div
          style={{
            background: `${result.color}12`,
            border: `1px solid ${result.color}55`,
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 18, color: result.color, fontWeight: 700 }}>{result.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: result.color }}>{result.phase}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground,#64748b)", marginTop: 2 }}>
              {result.detail}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[
            { label: "As-cast", T: 700, h: 0 },
            { label: "850 °C short", T: 850, h: 4 },
            { label: "700 °C / 72 h ✓", T: 700, h: 72 },
            { label: "900 °C", T: 900, h: 24 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => { setT(p.T); setHours(p.h); }}
              style={{
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border,#e2e8f0)",
                background: "var(--card,#fff)",
                color: "var(--foreground,#0f172a)",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
