import { useState } from "react";

export type ElKey = "Al" | "Cu" | "Fe" | "Mn";
export type Comp = Record<ElKey, number>;

// ============ PROPERTY CALCULATIONS ============
export interface Properties {
  hardness: number;
  density: number;
  meltingPoint: number;
  thermalConductivity: number;
  resistivityTendency: string;
  wearIndex: number;
  antibacterial: number;
}

export function computeProperties(c: Comp, e_a: number, isQC: boolean): Properties {
  const hardness = c.Al * 3 + c.Cu * 12 + c.Fe * 15 + c.Mn * 8;
  const density = (c.Al * 2.7 + c.Cu * 8.96 + c.Fe * 7.87 + c.Mn * 7.43) / 100;
  const meltingPoint = (c.Al * 660 + c.Cu * 1085 + c.Fe * 1538 + c.Mn * 1246) / 100;
  const thermalConductivity = (c.Al * 237 + c.Cu * 401 + c.Fe * 80 + c.Mn * 7.8) / 100;
  const resistivityTendency =
    e_a >= 1.8 && e_a <= 1.95
      ? "High resistivity expected ✦ (QC anomalous transport)"
      : "Normal metallic resistivity expected";
  const wearIndex = Math.min(10, (hardness / 900) * 6 + (1 - density / 8) * 4);
  const antibacterial = Math.min(
    10,
    c.Cu * 0.35 + c.Mn * 0.25 + (isQC ? 3.0 : 0) + (c.Cu > 15 ? 1.5 : 0)
  );
  return { hardness, density, meltingPoint, thermalConductivity, resistivityTendency, wearIndex, antibacterial };
}


// ============ STABILITY RULES ============
export interface StabilityRule {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  tooltip: string;
}

export function computeStability(c: Comp, e_a: number): { rules: StabilityRule[]; passed: number } {
  const rules: StabilityRule[] = [
    {
      label: "Hume-Rothery e/a",
      status: e_a >= 1.8 && e_a <= 1.95 ? "pass" : "fail",
      detail: `e/a = ${e_a.toFixed(3)}`,
      tooltip: "Icosahedral QC stable near e/a = 1.86",
    },
    {
      label: "Al Content",
      status: c.Al >= 62 && c.Al <= 72 ? "pass" : "warn",
      detail: c.Al < 62 ? `Low (${c.Al.toFixed(1)}%)` : c.Al > 72 ? `High (${c.Al.toFixed(1)}%)` : `Optimal (${c.Al.toFixed(1)}%)`,
      tooltip: "Al-rich matrix essential for QC formation",
    },
    {
      label: "Mn Doping",
      status: c.Mn >= 2 && c.Mn <= 6 ? "pass" : c.Mn > 6 ? "warn" : "fail",
      detail: c.Mn > 6 ? `Excess (${c.Mn.toFixed(1)}%)` : c.Mn < 2 ? `Low (${c.Mn.toFixed(1)}%)` : `Optimal (${c.Mn.toFixed(1)}%)`,
      tooltip: "Mn enhances catalytic + antibacterial activity but excess destabilizes QC phase",
    },
    {
      label: "Cu/Fe Balance",
      status: (() => {
        const r = c.Fe > 0 ? c.Cu / c.Fe : 0;
        return r >= 1.2 && r <= 1.8 ? "pass" : "warn";
      })(),
      detail: (() => {
        const r = c.Fe > 0 ? c.Cu / c.Fe : 0;
        return r > 1.8 ? `High (${r.toFixed(2)})` : r < 1.2 ? `Low (${r.toFixed(2)})` : `Optimal (${r.toFixed(2)})`;
      })(),
      tooltip: "Cu/Fe balance controls dodecahedral active site formation after leaching",
    },
  ];
  const passed = rules.filter((r) => r.status === "pass").length;
  return { rules, passed };
}

// ============ LEACHING SIMULATION ============
export interface LeachResult {
  before: Comp;
  after: Comp;
  cuSurface: number;
  activeSites: { label: string; cnt: string; color: string };
  cntRange: string;
  naohNote: string;
  dizEnhancement: number;
}

const NAOH_TABLE: Record<number, { aD: number; cuE: number; feE: number; mnE: number; warn?: string }> = {
  5: { aD: 0.45, cuE: 1.3, feE: 1.1, mnE: 1.2 },
  8: { aD: 0.65, cuE: 1.7, feE: 1.2, mnE: 1.4 },
  10: { aD: 0.85, cuE: 2.1, feE: 1.4, mnE: 1.6 },
  12: { aD: 0.9, cuE: 2.3, feE: 1.5, mnE: 1.7 },
  15: { aD: 0.93, cuE: 2.2, feE: 1.4, mnE: 1.6, warn: "Excess NaOH may damage QC structure" },
};

export function simulateLeaching(c: Comp, isQC: boolean, naoh: number): LeachResult {
  const f = NAOH_TABLE[naoh] ?? NAOH_TABLE[10];
  const Al_s = c.Al * (1 - f.aD);
  const Cu_s = c.Cu * f.cuE;
  const Fe_s = c.Fe * f.feE;
  const Mn_s = c.Mn * f.mnE;
  const tot = Al_s + Cu_s + Fe_s + Mn_s || 1;
  const after: Comp = {
    Al: (Al_s / tot) * 100,
    Cu: (Cu_s / tot) * 100,
    Fe: (Fe_s / tot) * 100,
    Mn: (Mn_s / tot) * 100,
  };
  let activeSites;
  if (after.Cu > 30) {
    activeSites = { label: "✅ Cu/Cu₂O dodecahedral active sites: HIGHLY LIKELY — excellent CNT nucleation", cnt: "HIGH", color: "#22C55E" };
  } else if (after.Cu > 20) {
    activeSites = { label: "⚠️ Cu/Cu₂O active sites: MODERATE — acceptable CNT nucleation", cnt: "MODERATE", color: "#F59E0B" };
  } else {
    activeSites = { label: "❌ Cu insufficient for active site formation", cnt: "LOW", color: "#EF4444" };
  }
  const cntRange =
    isQC && after.Cu > 20
      ? "29–118 nm (Ali et al., 2025)"
      : isQC
        ? "17–45 nm (un-leached QC reference)"
        : "Phase mismatch — CNT growth unlikely";
  const naohNote =
    naoh === 10
      ? "★ Optimal — matches published conditions"
      : f.warn ?? `Adjusted dissolution per ${naoh}M factors`;
  const dizEnhancement =
    after.Cu * 0.4 + after.Mn * 0.2 + (activeSites.cnt === "HIGH" ? 3 : 1);
  return { before: c, after, cuSurface: after.Cu, activeSites, cntRange, naohNote, dizEnhancement };
}


// ============ SHARED UI ============
function Bar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full overflow-hidden rounded-full bg-secondary" style={{ height }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s ease" }} />
    </div>
  );
}

// ============ PROPERTIES PANEL ============
export function PropertiesPanel({ props }: { props: Properties }) {
  const hardnessColor = props.hardness >= 700 ? "#22C55E" : props.hardness >= 400 ? "#F59E0B" : "#EF4444";
  const wearColor = props.wearIndex >= 6 ? "#22C55E" : props.wearIndex >= 4 ? "#F59E0B" : "#EF4444";
  const antiColor = props.antibacterial > 5 ? "#22C55E" : props.antibacterial >= 3 ? "#F59E0B" : "#EF4444";

  return (
    <section className="lg:col-span-6 rounded-xl border border-border bg-card p-5">
      <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 05</div>
      <h2 className="text-lg font-semibold">Estimated Physical Properties</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Rule-based estimates from composition — for guidance only, not experimental values
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Hardness</span>
            <span className="data-mono text-lg font-semibold" style={{ color: hardnessColor }}>
              {props.hardness.toFixed(0)} HV
            </span>
          </div>
          <div className="mt-2">
            <Bar value={props.hardness} max={1200} color={hardnessColor} />
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground data-mono">
              <span>0</span>
              <span>400 Soft</span>
              <span>700 Mod</span>
              <span>1200 Hard</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">QC alloys typically 700–900 HV</p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Density</span>
            <span className="data-mono text-lg font-semibold text-primary">
              {props.density.toFixed(2)} g/cm³
            </span>
          </div>
          <Bar value={props.density} max={9} color="#38BDF8" />
          <p className="mt-2 text-[10px] text-muted-foreground">Pure Al = 2.70 | Steel = 7.87</p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Melting Point</span>
            <span className="data-mono text-lg font-semibold text-primary">
              {props.meltingPoint.toFixed(0)} °C
            </span>
          </div>
          <Bar value={props.meltingPoint} max={1600} color="#a78bfa" />
          <p className="mt-2 text-[10px] text-muted-foreground">Actual QC solidus typically 850–950°C</p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Thermal Cond.</span>
            <span className="data-mono text-lg font-semibold text-primary">
              {props.thermalConductivity.toFixed(0)} W/mK
            </span>
          </div>
          <Bar value={props.thermalConductivity} max={400} color="#f97316" />
          <p className="mt-2 text-[10px] text-muted-foreground">
            QC alloys show anomalously LOW conductivity vs this estimate (quasiperiodic structure)
          </p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3 sm:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Electrical Resistivity</div>
          <div className="mt-1 data-mono text-sm" style={{ color: props.resistivityTendency.startsWith("High") ? "#22C55E" : "#94a3b8" }}>
            {props.resistivityTendency}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Wear Index</span>
            <span className="data-mono text-lg font-semibold" style={{ color: wearColor }}>
              {props.wearIndex.toFixed(1)}/10
            </span>
          </div>
          <Bar value={props.wearIndex} max={10} color={wearColor} />
          <p className="mt-2 text-[10px] text-muted-foreground">
            QC alloys excel in wear resistance — high hardness + low friction
          </p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Antibacterial</span>
            <span className="data-mono text-lg font-semibold" style={{ color: antiColor }}>
              {props.antibacterial.toFixed(1)}/10
            </span>
          </div>
          <Bar value={props.antibacterial} max={10} color={antiColor} />
          <p className="mt-2 text-[10px] text-muted-foreground">
            Cu/Cu₂O active sites — primary mechanism (Ali et al., 2025)
          </p>
        </div>
      </div>
    </section>
  );
}

// ============ STABILITY PANEL ============
export function StabilityPanel({ data }: { data: ReturnType<typeof computeStability> }) {
  const { rules, passed } = data;
  const badgeColor = passed === 4 ? "#22C55E" : passed === 3 ? "#F59E0B" : "#EF4444";
  return (
    <section className="lg:col-span-6 rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary">Panel 06</div>
          <h2 className="text-lg font-semibold">Phase Stability Analysis</h2>
          <p className="text-sm text-muted-foreground">Quasicrystal formation rule checks</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold data-mono"
          style={{ background: badgeColor + "22", color: badgeColor, border: `1px solid ${badgeColor}55` }}
        >
          {passed}/4 rules passed
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rules.map((r) => {
          const color = r.status === "pass" ? "#22C55E" : r.status === "warn" ? "#F59E0B" : "#EF4444";
          const icon = r.status === "pass" ? "✓" : r.status === "warn" ? "⚠" : "✗";
          return (
            <div
              key={r.label}
              title={r.tooltip}
              className="rounded-lg border bg-secondary/30 p-3"
              style={{ borderColor: color + "55" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="data-mono text-sm font-bold" style={{ color }}>
                  {icon} {r.status.toUpperCase()}
                </span>
              </div>
              <div className="data-mono mt-1 text-xs text-muted-foreground">{r.detail}</div>
              <div className="mt-1 text-[10px] text-muted-foreground italic">{r.tooltip}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============ LEACHING PANEL ============
const ELEM_COLORS: Record<ElKey, string> = { Al: "#94a3b8", Cu: "#f97316", Fe: "#a78bfa", Mn: "#ec4899" };

function CompBars({ comp }: { comp: Comp }) {
  return (
    <div className="space-y-1.5">
      {(Object.keys(comp) as ElKey[]).map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-6 data-mono text-xs" style={{ color: ELEM_COLORS[k] }}>{k}</span>
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div style={{ width: `${comp[k]}%`, height: "100%", background: ELEM_COLORS[k], transition: "width 0.3s" }} />
          </div>
          <span className="w-12 text-right data-mono text-xs text-primary">{comp[k].toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export function LeachingPanel({
  comp,
  isQC,
  naoh,
  setNaoh,
}: {
  comp: Comp;
  isQC: boolean;
  naoh: number;
  setNaoh: (n: number) => void;
}) {
  const result = simulateLeaching(comp, isQC, naoh);
  return (
    <section className="lg:col-span-7 rounded-xl border border-border bg-card p-5">
      <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 07</div>
      <h2 className="text-lg font-semibold">Post-Leaching Surface Prediction</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Simulation parameters derived from Ali et al. (2025) experimental data
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted-foreground">NaOH Concentration:</label>
        <select
          value={naoh}
          onChange={(e) => setNaoh(parseInt(e.target.value))}
          className="rounded-md border border-border bg-secondary/40 px-3 py-1 data-mono text-sm text-primary"
        >
          {[5, 8, 10, 12, 15].map((v) => (
            <option key={v} value={v}>{v}M</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{result.naohNote}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Before leaching</div>
          <CompBars comp={result.before} />
        </div>
        <div className="rounded-lg border bg-secondary/30 p-3" style={{ borderColor: result.activeSites.color + "55" }}>
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            After leaching (surface, simulated)
          </div>
          <CompBars comp={result.after} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border p-3" style={{ borderColor: result.activeSites.color + "55", background: result.activeSites.color + "10" }}>
        <div className="text-sm font-semibold" style={{ color: result.activeSites.color }}>
          {result.activeSites.label}
        </div>
        <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div>Expected CNT nucleation: <span className="data-mono" style={{ color: result.activeSites.color }}>{result.activeSites.cnt}</span></div>
          <div>Expected CNT diameter: <span className="data-mono text-primary">{result.cntRange}</span></div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Predicted DIZ enhancement vs base alloy:{" "}
          <span className="data-mono text-primary">+{result.dizEnhancement.toFixed(1)}%</span>{" "}
          <span className="italic">— synergistic Cu/Cu₂O + CNT effect (Ali et al., 2025)</span>
        </div>
      </div>
    </section>
  );
}


// ============ COMPARISON MODE ============
export interface Slot {
  comp: Comp;
  e_a: number;
  phase: string;
  confidence: number;
  hardness: number;
  density: number;
  antibacterial: number;
  stabilityScore: number;
  activeSites: string;
}

export function ComparisonPanel({
  slots,
  saveSlot,
  clearSlot,
  currentSlot,
}: {
  slots: (Slot | null)[];
  saveSlot: (idx: number) => void;
  clearSlot: (idx: number) => void;
  currentSlot: Slot;
}) {
  const labels = ["A", "B", "C"];
  const filled = slots.map((s) => s).filter((s): s is Slot => !!s);
  const allForBest = filled.length > 0 ? filled : [currentSlot];

  const bestFor = (key: keyof Slot, higher = true) => {
    if (!allForBest.length) return -1;
    const vals = allForBest.map((s) => s[key] as number);
    const best = higher ? Math.max(...vals) : Math.min(...vals);
    return vals.indexOf(best);
  };

  const bestQCIdx = (() => {
    const candidates = allForBest.filter((s) => s.phase.startsWith("Quasi"));
    if (!candidates.length) return -1;
    return allForBest.indexOf(candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a)));
  })();
  const bestAntiIdx = bestFor("antibacterial");

  const rows: { label: string; get: (s: Slot) => string; bestKey?: keyof Slot; higher?: boolean }[] = [
    { label: "Al %", get: (s) => s.comp.Al.toFixed(1) },
    { label: "Cu %", get: (s) => s.comp.Cu.toFixed(1) },
    { label: "Fe %", get: (s) => s.comp.Fe.toFixed(1) },
    { label: "Mn %", get: (s) => s.comp.Mn.toFixed(1) },
    { label: "e/a", get: (s) => s.e_a.toFixed(3) },
    { label: "Phase", get: (s) => s.phase },
    { label: "Confidence %", get: (s) => s.confidence.toFixed(1), bestKey: "confidence", higher: true },
    { label: "Hardness HV", get: (s) => s.hardness.toFixed(0), bestKey: "hardness", higher: true },
    { label: "Density g/cm³", get: (s) => s.density.toFixed(2) },
    { label: "Antibacterial /10", get: (s) => s.antibacterial.toFixed(1), bestKey: "antibacterial", higher: true },
    { label: "Stability /4", get: (s) => `${s.stabilityScore}/4`, bestKey: "stabilityScore", higher: true },
    { label: "Active Sites", get: (s) => s.activeSites },
  ];

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary">Panel 08</div>
          <h2 className="text-lg font-semibold">Side-by-Side Composition Comparison</h2>
          <p className="text-xs text-muted-foreground">Save up to 3 compositions for direct comparison</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {labels.map((l, i) => (
            <div key={l} className="flex items-center gap-1">
              <button
                onClick={() => saveSlot(i)}
                className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                Save as Comp {l}
              </button>
              {slots[i] && (
                <button
                  onClick={() => clearSlot(i)}
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"
                  title={`Clear Comp ${l}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {filled.length === 0 ? (
        <p className="text-sm text-muted-foreground">No slots saved yet. Use the buttons above to save the current composition.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {bestQCIdx >= 0 && (
              <span className="rounded-full bg-qc-positive/15 px-3 py-1 text-xs text-qc-positive border border-qc-positive/30">
                ★ Optimal QC Composition: Comp {labels[bestQCIdx]}
              </span>
            )}
            {bestAntiIdx >= 0 && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary border border-primary/30">
                ★ Optimal Antibacterial Performance: Comp {labels[bestAntiIdx]}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 text-left">Metric</th>
                  {slots.map((s, i) =>
                    s ? (
                      <th key={i} className="px-2 py-2 text-right">Comp {labels[i]}</th>
                    ) : null
                  )}
                </tr>
              </thead>
              <tbody className="data-mono">
                {rows.map((row) => {
                  let bestIdx = -1;
                  if (row.bestKey) {
                    const vals = slots.map((s) => (s ? (s[row.bestKey!] as number) : -Infinity));
                    bestIdx = vals.indexOf(Math.max(...vals));
                  }
                  return (
                    <tr key={row.label} className="border-b border-border/40">
                      <td className="px-2 py-1.5 text-left text-muted-foreground font-sans">{row.label}</td>
                      {slots.map((s, i) =>
                        s ? (
                          <td
                            key={i}
                            className="px-2 py-1.5 text-right"
                            style={{ color: bestIdx === i ? "#22C55E" : "#F1F5F9", fontWeight: bestIdx === i ? 700 : 400 }}
                          >
                            {row.get(s)}
                          </td>
                        ) : null
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// ============ EXPORT PANEL ============
export function ExportPanel({
  buildReportHTML,
  bibtex,
  pythonDict,
}: {
  buildReportHTML: () => string;
  bibtex: string;
  pythonDict: string;
}) {
  const [copied, setCopied] = useState("");

  const flash = (label: string) => {
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  const downloadPDF = () => {
    const html = buildReportHTML();
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wider text-primary">Panel 09</div>
        <h2 className="text-lg font-semibold">Export for Research</h2>
        <p className="text-xs text-muted-foreground">Generate PDF reports, citations, and ML-ready data</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={downloadPDF}
          className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          📄 Generate PDF Report
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(bibtex);
            flash("BibTeX copied");
          }}
          className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
        >
          📚 Copy BibTeX Citation
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(pythonDict);
            flash("Python dict copied");
          }}
          className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
        >
          🐍 Copy Python Dict
        </button>
        {copied && <span className="self-center text-xs text-qc-positive">✓ {copied}</span>}
      </div>
    </section>
  );
}
