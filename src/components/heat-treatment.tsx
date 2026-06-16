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
  status: "mixed" | "pure" | "lost" | "transition";
}[] = [
  {
    id: "lt700",
    label: "< 700 °C",
    temp: "< 700 °C",
    time: "—",
    phase: "β + QC mixed",
    detail: "Below the optimal annealing window — β-phase coexists with icosahedral QC nuclei.",
    status: "mixed",
  },
  {
    id: "700to850",
    label: "700–850 °C",
    temp: "700–850 °C",
    time: "≥ 24 h",
    phase: "QC forming",
    detail: "Optimal annealing window. At 700 °C / 72 h, pure icosahedral QC is obtained.",
    status: "pure",
  },
  {
    id: "850",
    label: "850 °C",
    temp: "850 °C",
    time: "short",
    phase: "QC + β mixed",
    detail: "Transition zone — QC and β-phase coexist. QC fraction decreases as temperature rises.",
    status: "transition",
  },
  {
    id: "884",
    label: "884 °C",
    temp: "884 °C",
    time: "—",
    phase: "Phase transition point",
    detail: "DTA-confirmed transition temperature. QC stability limit — above this QC begins to decompose.",
    status: "transition",
  },
  {
    id: "gt900",
    label: "> 900 °C",
    temp: "> 900 °C",
    time: "—",
    phase: "β dominates, QC disappears",
    detail: "Above the QC stability ceiling — β-phase becomes dominant and quasicrystal is fully lost.",
    status: "lost",
  },
];

function statusColor(s: "mixed" | "pure" | "lost" | "transition") {
  if (s === "pure") return "#22C55E";
  if (s === "mixed") return "#F59E0B";
  if (s === "transition") return "#8B5CF6";
  return "#EF4444";
}
function statusIcon(s: "mixed" | "pure" | "lost" | "transition") {
  if (s === "pure") return "✓";
  if (s === "mixed") return "◐";
  if (s === "transition") return "↔";
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

  // > 900 °C — β dominates, QC disappears
  if (T > 900) {
    return {
      phase: "β dominates, QC disappears",
      detail: `T = ${T} °C exceeds 900 °C — β-phase becomes dominant and quasicrystal is fully lost.`,
      color: "#EF4444",
      icon: "✗",
    };
  }

  // 884 °C — DTA-confirmed phase transition point
  if (T >= 880 && T <= 900) {
    return {
      phase: "Phase transition point (DTA confirmed)",
      detail: `T = ${T} °C — at the DTA-confirmed transition limit (~884 °C). QC begins decomposing into β-phase.`,
      color: "#8B5CF6",
      icon: "↔",
    };
  }

  // 850 °C — QC + β mixed (transition zone)
  if (T >= 850 && T < 880) {
    return {
      phase: "QC + β mixed (transition zone)",
      detail: `T = ${T} °C — transition zone. QC and β-phase coexist; QC fraction decreases as temperature rises.`,
      color: "#8B5CF6",
      icon: "↔",
    };
  }

  // 700–850 °C — QC forming (optimal: 700 °C, 72 h)
  if (T >= 700 && T < 850 && hours >= 24) {
    return {
      phase: T === 700 && hours >= 72 ? "Pure icosahedral QC" : "QC forming",
      detail: `T = ${T} °C, t = ${hours} h — QC forming window.${
        T === 700 && hours >= 72
          ? " Optimal condition reached — single-phase i-QC expected."
          : " Partial or growing QC. Increase time or move toward 700 °C for pure QC."
      }${predKind === "APPROX" ? " Borderline composition — yield may be reduced." : ""}`,
      color: T === 700 && hours >= 72 ? "#22C55E" : "#8B5CF6",
      icon: T === 700 && hours >= 72 ? "✓" : "↔",
    };
  }

  // < 700 °C — β + QC mixed
  return {
    phase: "β + QC mixed",
    detail: `T = ${T} °C, t = ${hours} h — below optimal window. β-phase coexists with icosahedral QC nuclei.`,
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
          gridTemplateColumns: "repeat(5, 1fr)",
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
