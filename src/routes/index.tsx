import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  computeProperties,
  computeStability,
  simulateLeaching,
  PropertiesPanel,
  StabilityPanel,
  LeachingPanel,
  ComparisonPanel,
  ExportPanel,
  type Slot,
} from "@/components/qc-modules";
import {
  MLDiscoveryPanel,
  DopantExplorer,
  TsaiRulesPanel,
  QCTypeIndicator,
  ReferencesPanel,
} from "@/components/qc-extras";
import { CNTPredictor } from "@/components/cnt-predictor";
import { XRDVisualizer } from "@/components/xrd-visualizer";
import { AIAnalysis } from "@/components/ai-analysis";
import { ReferenceDataset } from "@/components/reference-dataset";
import { HeatTreatmentPanel } from "@/components/heat-treatment";
import { CoSubstitutionPanel } from "@/components/co-substitution";
import { Annealing600CPanel } from "@/components/annealing-600c";
import { KnowledgeBasePanel } from "@/components/knowledge-base";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QC Phase Predictor — Al-Cu-Fe-Mn Quasicrystal Tool" },
      {
        name: "description",
        content:
          "Computational tool for predicting quasicrystalline phase formation in Al-Cu-Fe-Mn quaternary alloy systems.",
      },
    ],
  }),
  component: QCPredictor,
});

// ============ ELEMENT DATA ============
// Hume-Rothery effective valences (Raynor scheme) used for e/a in Al-TM systems.
// Transition metals act as electron SINKS in Al-rich alloys, giving the small
// e/a values (~1.75–1.86) where icosahedral QCs are stable. Group-number
// valences would falsely give e/a ≈ 3.3 for the canonical Al₆₃Cu₂₅Fe₁₂ i-QC.
const ELEMENTS = {
  Al: { name: "Aluminum",  valence:  3.00, vec: 3,  en: 1.61, radius: 143, color: "#94a3b8" },
  Cu: { name: "Copper",    valence:  1.00, vec: 11, en: 1.90, radius: 128, color: "#f97316" },
  Fe: { name: "Iron",      valence: -2.66, vec: 8,  en: 1.83, radius: 126, color: "#a78bfa" },
  Mn: { name: "Manganese", valence: -3.66, vec: 7,  en: 1.55, radius: 127, color: "#ec4899" },
} as const;

// Extended recognized elements (not on sliders; used by reference scorer + AI).
export const EXT_ELEMENTS = {
  Ni: { valence:  0.00, note: "Effective ~0 in Al-rich; enables Al-Ni-Fe decagonal" },
  Co: { valence: -1.71, note: "Co > 5 at% in Al-Cu-Fe-Co → decagonal QC (Kim 2002)" },
  B:  { valence:  3.00, note: "1–3 at% B refines solidification, reduces brittleness, stays i-QC" },
  Cr: { valence: -1.66, note: "Stabilizes i-QC in Al-Cu-Fe-Cr" },
  Si: { valence:  4.00, note: "Expands i-QC e/a window (Murty et al.)" },
} as const;

type ElKey = keyof typeof ELEMENTS;
type Comp = Record<ElKey, number>;

const RANGES: Record<ElKey, [number, number]> = {
  Al: [50, 85],
  Cu: [0, 30],
  Fe: [0, 25],
  Mn: [0, 15],
};

interface Preset {
  label: string;
  comp: Comp;
  note: string;
}
const PRESETS: { category: "QC" | "APPROX" | "ORDINARY"; title: string; items: Preset[] }[] = [
  {
    category: "QC",
    title: "✓ Strong QC Formers",
    items: [
      { label: "Al₆₃Cu₂₅Fe₁₂ (canonical i-QC)", comp: { Al: 63, Cu: 25, Fe: 12, Mn: 0 }, note: "Tsai — Hume-Rothery e/a ≈ 1.75" },
      { label: "Al₆₅Cu₂₀Fe₁₅ (Rosas 1998)",     comp: { Al: 65, Cu: 20, Fe: 15, Mn: 0 }, note: "Pure i-QC at 700°C/72h" },
      { label: "Ali et al. (2025) Mn-stabilized", comp: { Al: 63, Cu: 18, Fe: 12, Mn: 7 }, note: "Mn at upper edge — borderline" },
      { label: "Al₆₅Cu₂₀Fe₁₀Mn₅",                comp: { Al: 65, Cu: 20, Fe: 10, Mn: 5 }, note: "Mn-doped i-QC" },
      { label: "Al-rich i-QC",                    comp: { Al: 70, Cu: 15, Fe: 12, Mn: 3 }, note: "Al-rich variant" },
    ],
  },
  {
    category: "APPROX",
    title: "⚠ Approximant / Borderline",
    items: [
      { label: "High Mn (β-Mn risk)", comp: { Al: 63, Cu: 17, Fe: 12, Mn: 8 }, note: "Mn > 6%" },
      { label: "Low Al",              comp: { Al: 58, Cu: 22, Fe: 13, Mn: 7 }, note: "Al below threshold" },
      { label: "Cu-edge",             comp: { Al: 60, Cu: 27, Fe: 10, Mn: 3 }, note: "Cu at upper canonical edge" },
    ],
  },
  {
    category: "ORDINARY",
    title: "✗ Non-QC / Ordinary Crystal",
    items: [
      { label: "Al-excess",     comp: { Al: 80, Cu: 8,  Fe: 8,  Mn: 4 },  note: "Al far too high" },
      { label: "Al-deficient",  comp: { Al: 55, Cu: 25, Fe: 15, Mn: 5 },  note: "Al too low" },
      { label: "Fe-deficient",  comp: { Al: 65, Cu: 20, Fe: 5,  Mn: 10 }, note: "Fe low, Mn excessive" },
    ],
  },
];

// ============ CALCULATIONS ============
function computeDescriptors(c: Comp) {
  const total = c.Al + c.Cu + c.Fe + c.Mn;
  // e/a uses Raynor effective valences (Fe, Mn negative). Hume-Rothery target
  // for Al-Cu-Fe(-Mn) icosahedral QCs: e/a ≈ 1.75–1.86.
  const e_a =
    (c.Al * ELEMENTS.Al.valence +
      c.Cu * ELEMENTS.Cu.valence +
      c.Fe * ELEMENTS.Fe.valence +
      c.Mn * ELEMENTS.Mn.valence) /
    100;
  const en = (c.Al * 1.61 + c.Cu * 1.9 + c.Fe * 1.83 + c.Mn * 1.55) / 100;
  const radius = (c.Al * 143 + c.Cu * 128 + c.Fe * 126 + c.Mn * 127) / 100;
  const vec = (c.Al * 3 + c.Cu * 11 + c.Fe * 8 + c.Mn * 7) / 100;
  const r_avg = radius;
  const delta =
    Math.sqrt(
      (c.Al / 100) * Math.pow(1 - 143 / r_avg, 2) +
        (c.Cu / 100) * Math.pow(1 - 128 / r_avg, 2) +
        (c.Fe / 100) * Math.pow(1 - 126 / r_avg, 2) +
        (c.Mn / 100) * Math.pow(1 - 127 / r_avg, 2)
    ) * 100;
  const R = 8.314;
  const xs: number[] = [c.Al, c.Cu, c.Fe, c.Mn].map((v) => v / 100).filter((x) => x > 0);
  const entropy = -R * xs.reduce((s, x) => s + x * Math.log(x), 0);
  return { e_a, en, radius, vec, total, delta, entropy };
}

export type PredKind = "QC" | "DQC" | "APPROX" | "ORDINARY" | "INVALID";
interface Prediction {
  kind: PredKind;
  label: string;
  confidence: number;
  color: string;
  icon: string;
  reasoning: string;
  warning?: string;
}

// Optional hints from non-quaternary elements used by reference-dataset scoring.
export interface PredictHints {
  co?: number; // enables Decagonal QC branch
  ni?: number;
  b?: number;  // refines i-QC at 1–3 at%
}

function predict(c: Comp, e_a: number, total: number, hints: PredictHints = {}): Prediction {
  if (total < 98 || total > 102) {
    return {
      kind: "INVALID",
      label: "Enter valid composition to predict",
      confidence: 0,
      color: "#64748B",
      icon: "⟳",
      reasoning: `Total must be 98–102%. Current total = ${total.toFixed(1)}%`,
    };
  }
  const { Al, Cu, Fe, Mn } = c;
  const co = hints.co ?? 0;
  const b = hints.b ?? 0;

  // Decagonal branch — Al-Cu-Fe-Co with Co ≥ 5 at% (Kim et al. 2002)
  if (co >= 5 && Al >= 60 && Al <= 72 && Cu >= 15 && Cu <= 25) {
    return {
      kind: "DQC",
      label: "Decagonal QC (d-phase)",
      confidence: co >= 8 ? 85 : 65,
      color: "#a855f7",
      icon: "❉",
      reasoning: `Co = ${co.toFixed(1)} at% drives d-QC formation (10-fold in-plane, periodic ⟂). Pure d-QC above ~8 at% Co (Kim 2002).`,
      warning: co < 8 ? "i-QC + d-QC coexistence region (5–8 at% Co)" : undefined,
    };
  }

  // Icosahedral i-QC band — canonical Al-Cu-Fe at Cu 24–25, Fe 10–15.
  // Mn is OPTIONAL (0–6 at%); Mn = 0 still allowed. Mn > 6 penalized (β-Mn).
  const mnOK = Mn >= 0 && Mn <= 6;
  const warning =
    Mn > 6 ? "High Mn (>6 at%) — β-Mn competing phase" :
    b  > 3 ? "B > 3 at% — solidification effects exceed i-QC window" : undefined;

  if (Al >= 60 && Al <= 72 && Cu >= 10 && Cu <= 27 && Fe >= 10 && Fe <= 15 && mnOK) {
    // Hume-Rothery e/a target band 1.75–1.86 for Al-Cu-Fe(-Mn) i-QC
    const eaCenter = 1.805;
    const eaHalfWidth = 0.085;
    const proximity = Math.max(0, 1 - Math.abs(e_a - eaCenter) / eaHalfWidth);
    const bBonus = b >= 1 && b <= 3 ? 5 : 0;
    const confidence = Math.min(95, 65 + proximity * 25 + bBonus);
    return {
      kind: "QC",
      label: "Icosahedral QC (i-phase)",
      confidence,
      color: "#22C55E",
      icon: "✦",
      reasoning: `Inside Al-Cu-Fe(-Mn) i-QC field. e/a = ${e_a.toFixed(3)} vs Hume-Rothery target 1.75–1.86.${b >= 1 ? ` B = ${b} at% refines solidification.` : ""}`,
      warning,
    };
  }

  if (Al >= 58 && Al <= 75 && Cu >= 8 && Cu <= 28 && Fe >= 8 && Fe <= 17 && Mn >= 0 && Mn <= 9) {
    const seed = (Al * 7.3 + Cu * 3.1 + Fe * 5.7 + Mn * 11.9) % 1;
    const confidence = 35 + seed * 20;
    return {
      kind: "APPROX",
      label: "Approximant Crystal",
      confidence,
      color: "#F59E0B",
      icon: "◈",
      reasoning:
        Mn > 6
          ? "Mn > 6 at% destabilizes i-QC → periodic β-Mn approximant."
          : "Adjacent to i-QC field — periodic approximant expected.",
      warning: warning ?? "Periodic approximant structure expected",
    };
  }

  const reasons: string[] = [];
  if (Al < 60) reasons.push("Al too low (<60%)");
  if (Al > 72) reasons.push("Al too high (>72%)");
  if (Cu < 10) reasons.push("Cu insufficient (<10%)");
  if (Cu > 27) reasons.push("Cu excessive (>27%)");
  if (Fe < 10) reasons.push("Fe insufficient (<10%)");
  if (Fe > 15) reasons.push("Fe excessive (>15%)");
  if (Mn > 6)  reasons.push("Mn excessive (>6%)");
  const seed = (Al * 7.3 + Cu * 3.1 + Fe * 5.7 + Mn * 11.9) % 1;
  const confidence = 10 + seed * 20;
  return {
    kind: "ORDINARY",
    label: "Ordinary Crystal / Multi-phase",
    confidence,
    color: "#EF4444",
    icon: "◻",
    reasoning: reasons.length
      ? `Outside QC phase field: ${reasons.join(", ")}`
      : `Outside QC phase field (e/a = ${e_a.toFixed(3)})`,
    warning,
  };
}

export { predict, computeDescriptors };


// ============ NORMALIZATION (Explorer mode) ============
function normalizeOnChange(prev: Comp, key: ElKey, newVal: number): Comp {
  const [min, max] = RANGES[key];
  newVal = Math.max(min, Math.min(max, newVal));
  const others: ElKey[] = (Object.keys(prev) as ElKey[]).filter((k) => k !== key);
  const remaining = 100 - newVal;
  const othersSum = others.reduce((s, k) => s + prev[k], 0);
  const next: Comp = { ...prev, [key]: newVal };
  if (othersSum > 0) {
    others.forEach((k) => {
      const scaled = (prev[k] / othersSum) * remaining;
      next[k] = Math.max(0, scaled);
    });
  }
  const sum = next.Al + next.Cu + next.Fe + next.Mn;
  const diff = 100 - sum;
  if (Math.abs(diff) > 0.01) {
    const sortable = others.sort((a, b) => next[b] - next[a]);
    if (sortable[0]) next[sortable[0]] += diff;
  }
  return next;
}

function autoNormalize(c: Comp): Comp {
  const total = c.Al + c.Cu + c.Fe + c.Mn;
  if (total <= 0) return c;
  const f = 100 / total;
  return { Al: c.Al * f, Cu: c.Cu * f, Fe: c.Fe * f, Mn: c.Mn * f };
}

// ============ COMPONENT ============
type Mode = "literature" | "explorer";
type Source = "Literature" | "Manual";

interface HistoryRow {
  id: number;
  comp: Comp;
  e_a: number;
  pred: Prediction;
  source: Source;
  ts: string;
}

function QCPredictor() {
  const [mode, setMode] = useState<Mode>("literature");
  const [comp, setComp] = useState<Comp>({ Al: 65, Cu: 20, Fe: 10, Mn: 5 });
  const [source, setSource] = useState<Source>("Literature");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showPresets, setShowPresets] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "QC" | "APPROX" | "ORDINARY">("ALL");
  const [naoh, setNaoh] = useState(10);
  const [slots, setSlots] = useState<(Slot | null)[]>([null, null, null]);
  const [loadedFrom, setLoadedFrom] = useState<string | null>("Tsai Classic");
  const [pulseKey, setPulseKey] = useState(0);

  const desc = useMemo(() => computeDescriptors(comp), [comp]);
  const pred = useMemo(() => predict(comp, desc.e_a, desc.total), [comp, desc]);

  const props = useMemo(() => computeProperties(comp, desc.e_a, pred.kind === "QC"), [comp, desc.e_a, pred.kind]);
  const stability = useMemo(() => computeStability(comp, desc.e_a), [comp, desc.e_a]);
  const leach = useMemo(() => simulateLeaching(comp, pred.kind === "QC", naoh), [comp, pred.kind, naoh]);

  const currentSlot: Slot = useMemo(
    () => ({
      comp: { ...comp },
      e_a: desc.e_a,
      phase: pred.label,
      confidence: pred.confidence,
      hardness: props.hardness,
      density: props.density,
      antibacterial: props.antibacterial,
      stabilityScore: stability.passed,
      activeSites: leach.activeSites.cnt,
    }),
    [comp, desc.e_a, pred, props, stability, leach]
  );

  const saveSlot = (idx: number) =>
    setSlots((s) => {
      const next = [...s];
      next[idx] = currentSlot;
      return next;
    });
  const clearSlot = (idx: number) =>
    setSlots((s) => {
      const next = [...s];
      next[idx] = null;
      return next;
    });

  // record to history (debounced)
  useEffect(() => {
    if (pred.kind === "INVALID") return;
    const t = setTimeout(() => {
      setHistory((h) => {
        const last = h[h.length - 1];
        if (
          last &&
          Math.abs(last.comp.Al - comp.Al) < 0.05 &&
          Math.abs(last.comp.Cu - comp.Cu) < 0.05 &&
          Math.abs(last.comp.Fe - comp.Fe) < 0.05 &&
          Math.abs(last.comp.Mn - comp.Mn) < 0.05
        )
          return h;
        return [
          ...h,
          {
            id: (h[h.length - 1]?.id ?? 0) + 1,
            comp: { ...comp },
            e_a: desc.e_a,
            pred,
            source,
            ts: new Date().toLocaleTimeString(),
          },
        ].slice(-50);
      });
    }, 700);
    return () => clearTimeout(t);
  }, [comp, desc.e_a, pred, source]);

  const handleSlider = (k: ElKey, v: number) => {
    setComp((p) => normalizeOnChange(p, k, v));
    setLoadedFrom(null);
  };
  const handleNumber = (k: ElKey, v: number) => {
    setComp((p) => ({ ...p, [k]: isNaN(v) ? 0 : Math.max(0, v) }));
    setSource("Manual");
    setLoadedFrom(null);
  };

  const loadPreset = (p: Preset) => {
    setComp({ ...p.comp });
    setMode("literature");
    setSource("Literature");
    setLoadedFrom(p.label);
  };

  const resetComp = () => {
    setComp({ Al: 65, Cu: 20, Fe: 10, Mn: 5 });
    setSource("Literature");
    setLoadedFrom("Tsai Classic");
  };

  const reloadFromHistory = (r: HistoryRow) => {
    setComp({ ...r.comp });
    setSource(r.source);
    setLoadedFrom(null);
  };

  const loadExternalComp = (c: Comp, label: string) => {
    setComp({ ...c });
    setMode("literature");
    setSource("Literature");
    setLoadedFrom(label);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const predictFromExt = (c: Comp) => {
    const d = computeDescriptors(c);
    const p = predict(c, d.e_a, d.total);
    const pr = computeProperties(c, d.e_a, p.kind === "QC");
    return {
      label: p.label,
      confidence: p.confidence,
      color: p.color,
      kind: p.kind,
      ea: d.e_a,
      api: pr.antibacterial,
    };
  };

  // Pulse on prediction change
  useEffect(() => {
    setPulseKey((k) => k + 1);
  }, [pred.kind, pred.label]);


  const exportCSV = () => {
    const header = "#,Al,Cu,Fe,Mn,Total,e/a,Phase,Confidence,Source,Time\n";
    const rows = history
      .map(
        (r) =>
          `${r.id},${r.comp.Al.toFixed(2)},${r.comp.Cu.toFixed(2)},${r.comp.Fe.toFixed(2)},${r.comp.Mn.toFixed(2)},${(r.comp.Al + r.comp.Cu + r.comp.Fe + r.comp.Mn).toFixed(2)},${r.e_a.toFixed(3)},${r.pred.label},${r.pred.confidence.toFixed(1)},${r.source},${r.ts}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qc_session_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };




  const bestQC = useMemo(() => {
    const qcs = history.filter((r) => r.pred.kind === "QC");
    if (!qcs.length) return null;
    return qcs.reduce((a, b) => (b.pred.confidence > a.pred.confidence ? b : a));
  }, [history]);

  const radarData = [
    { axis: "Al", value: comp.Al, ref: 65 },
    { axis: "Cu", value: comp.Cu, ref: 15 },
    { axis: "Fe", value: comp.Fe, ref: 12 },
    { axis: "Mn", value: comp.Mn, ref: 4 },
  ];

  const totalDiff = Math.abs(desc.total - 100);
  const totalBadge =
    totalDiff < 0.1
      ? { color: "#22C55E", text: `✓ ${desc.total.toFixed(1)}%`, bg: "rgba(34,197,94,0.1)" }
      : totalDiff <= 2
        ? { color: "#F59E0B", text: `⚠ ${desc.total.toFixed(1)}% — normalize?`, bg: "rgba(245,158,11,0.1)" }
        : { color: "#EF4444", text: `✗ ${desc.total.toFixed(1)}% — invalid`, bg: "rgba(239,68,68,0.1)" };

  const bibtex = `@software{QCPhasePredictor2025,
  title  = {QC Phase Predictor: A Computational Tool for Quasicrystalline Phase Prediction in Al-Cu-Fe-Mn Systems},
  author = {[Author] and Ali, F.},
  year   = {2025},
  note   = {Research Tool v2.0. Based on HYPOD-X database and established QC formation criteria.},
  url    = {${typeof window !== "undefined" ? window.location.origin : ""}}
}`;

  const pythonDict = (() => {
    const arr = history.map((r) => ({
      Al: +r.comp.Al.toFixed(2),
      Cu: +r.comp.Cu.toFixed(2),
      Fe: +r.comp.Fe.toFixed(2),
      Mn: +r.comp.Mn.toFixed(2),
      e_a: +r.e_a.toFixed(3),
      phase: r.pred.kind,
      confidence: +r.pred.confidence.toFixed(1),
      source: r.source,
    }));
    return `# QC Phase Predictor — session export\ncompositions = ${JSON.stringify(arr, null, 2)}\n\nimport pandas as pd\ndf = pd.DataFrame(compositions)\nprint(df.head())`;
  })();

  const buildReportHTML = () => {
    const ts = new Date().toLocaleString();
    const ruleRows = stability.rules
      .map(
        (r) =>
          `<tr><td>${r.label}</td><td style="color:${r.status === "pass" ? "#16a34a" : r.status === "warn" ? "#d97706" : "#dc2626"}">${r.status.toUpperCase()}</td><td>${r.detail}</td></tr>`
      )
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>QC Phase Predictor Report</title>
<style>
body{font-family:-apple-system,Inter,Arial,sans-serif;color:#0f172a;padding:32px;max-width:780px;margin:auto;}
h1{color:#0369a1;margin:0 0 4px;font-size:22px;}
h2{color:#0369a1;font-size:14px;margin:20px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;}
td,th{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;}
th{background:#f1f5f9;}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;}
.footer{margin-top:24px;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px;}
</style></head><body>
<h1>QC Phase Predictor — Analysis Report</h1>
<div style="font-size:11px;color:#64748b;">Computational Prediction for Al-Cu-Fe-Mn Quasicrystalline Systems<br/>Generated: ${ts} · Tool Version: v2.0</div>

<h2>Composition (at%)</h2>
<table><tr><th>Al</th><th>Cu</th><th>Fe</th><th>Mn</th><th>Total</th></tr>
<tr class="mono"><td>${comp.Al.toFixed(2)}</td><td>${comp.Cu.toFixed(2)}</td><td>${comp.Fe.toFixed(2)}</td><td>${comp.Mn.toFixed(2)}</td><td>${desc.total.toFixed(2)}</td></tr></table>

<h2>Predicted Phase</h2>
<p><span class="badge" style="background:${pred.color}22;color:${pred.color};border:1px solid ${pred.color}55;">${pred.label}</span>
&nbsp;Confidence: <span class="mono">${pred.confidence.toFixed(1)}%</span></p>
<p style="font-size:12px;color:#475569;">${pred.reasoning}</p>

<h2>Estimated Properties</h2>
<table class="mono">
<tr><td>Hardness (HV)</td><td>${props.hardness.toFixed(0)}</td></tr>
<tr><td>Density (g/cm³)</td><td>${props.density.toFixed(2)}</td></tr>
<tr><td>Melting Point (°C)</td><td>${props.meltingPoint.toFixed(0)}</td></tr>
<tr><td>Thermal Conductivity (W/mK)</td><td>${props.thermalConductivity.toFixed(0)}</td></tr>
<tr><td>e/a ratio</td><td>${desc.e_a.toFixed(3)}</td></tr>
<tr><td>VEC</td><td>${desc.vec.toFixed(3)}</td></tr>
<tr><td>Avg. EN</td><td>${desc.en.toFixed(3)}</td></tr>
<tr><td>Avg. radius (pm)</td><td>${desc.radius.toFixed(1)}</td></tr>
<tr><td>Wear Index /10</td><td>${props.wearIndex.toFixed(1)}</td></tr>
<tr><td>Antibacterial Index /10</td><td>${props.antibacterial.toFixed(1)}</td></tr>
<tr><td>Electrical Resistivity</td><td>${props.resistivityTendency}</td></tr>
</table>

<h2>Phase Stability Rules (${stability.passed}/4 passed)</h2>
<table><tr><th>Rule</th><th>Status</th><th>Detail</th></tr>${ruleRows}</table>

<h2>Leaching Simulation (${naoh}M NaOH)</h2>
<table class="mono"><tr><th></th><th>Al</th><th>Cu</th><th>Fe</th><th>Mn</th></tr>
<tr><td>Before</td><td>${leach.before.Al.toFixed(1)}</td><td>${leach.before.Cu.toFixed(1)}</td><td>${leach.before.Fe.toFixed(1)}</td><td>${leach.before.Mn.toFixed(1)}</td></tr>
<tr><td>After (surface)</td><td>${leach.after.Al.toFixed(1)}</td><td>${leach.after.Cu.toFixed(1)}</td><td>${leach.after.Fe.toFixed(1)}</td><td>${leach.after.Mn.toFixed(1)}</td></tr></table>
<p style="font-size:12px;"><b>${leach.activeSites.label}</b><br/>Expected CNT diameter: ${leach.cntRange}</p>

<div class="footer">
QC Phase Predictor v2.0 · Based on HYPOD-X Database (Fujita et al., 2024) and Ali et al. (2025)<br/>
For research guidance only — experimental validation required.
</div>
</body></html>`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "l") {
        e.preventDefault();
        const allPresets = PRESETS.flatMap((g) => g.items);
        const idx = allPresets.findIndex((p) => p.label === loadedFrom);
        const next = allPresets[(idx + 1) % allPresets.length];
        if (next) loadPreset(next);
      } else if (k === "n") {
        e.preventDefault();
        setComp(autoNormalize(comp));
      } else if (k === "e") {
        e.preventDefault();
        exportCSV();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp, loadedFrom]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="penrose-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12,2 14.6,9.5 22,9.5 16,14 18.5,21.5 12,17 5.5,21.5 8,14 2,9.5 9.4,9.5" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">QC Phase Predictor</h1>
                  <p className="text-sm text-muted-foreground">
                    Computational Tool for Quasicrystalline Phase Prediction in Al-Cu-Fe-Mn Systems
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-mono text-sky-300"
                title="Research preview build"
              >
                v2.0 | Research Preview
              </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-border bg-secondary hover:bg-secondary/80">
                  ℹ️ About
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle>QC Phase Predictor v2.0</DialogTitle>
                  <DialogDescription className="text-muted-foreground pt-2 space-y-3 text-sm">
                    <span className="block">
                      A computational research tool for predicting quasicrystalline phase
                      formation in Al-Cu-Fe-Mn quaternary alloy systems.
                    </span>
                    <span className="block">
                      <strong className="text-foreground">Scientific Basis:</strong>
                      <ul className="ml-4 mt-1 list-disc space-y-0.5">
                        <li>Hume-Rothery electron concentration rules</li>
                        <li>Tsai's five QC formation criteria</li>
                        <li>HYPOD-X compositional database (Fujita et al., 2024)</li>
                        <li>Ali et al. (2025) — AlCuFeMn QC + CNT catalytic growth and antibacterial activity</li>
                        <li>Liu et al. (2021) — ML prediction of QC phases from composition</li>
                        <li>Uryu et al. (2023) — Three new QCs predicted and confirmed by ML</li>
                      </ul>
                    </span>
                    <span className="block">
                      <strong className="text-foreground">Development Roadmap:</strong>
                      <ul className="ml-4 mt-1 list-disc space-y-0.5">
                        <li>v1.0 — Rule-based heuristic engine</li>
                        <li>v2.0 — Extended modules: XRD simulation, leaching, CNT growth, AI analysis</li>
                        <li>v3.0 — Random Forest model (HYPOD-X trained)</li>
                        <li>v4.0 — Experimental validation integrated</li>
                      </ul>
                    </span>
                    <span className="block italic">
                      Disclaimer: This tool provides computational estimates for research
                      guidance. All predictions require experimental validation. Property
                      estimates use linear mixing rules and do not account for quasiperiodic
                      structural anomalies.
                    </span>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            </div>

          </div>
        </div>
      </header>



      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* PANEL 1 — COMPOSITION INPUT */}
          <section className="lg:col-span-4 rounded-xl border border-border bg-card p-5">
            <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 01</div>
            <h2 className="text-lg font-semibold">Alloy Composition Input</h2>
            <p className="text-sm text-muted-foreground mb-4">Al-Cu-Fe-Mn Quaternary System</p>

            {/* Mode toggle */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-1">
              <button
                onClick={() => setMode("literature")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "literature"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Literature Mode
              </button>
              <button
                onClick={() => setMode("explorer")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "explorer"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Explorer Mode
              </button>
            </div>

            <div className="space-y-3">
              {(Object.keys(ELEMENTS) as ElKey[]).map((k) => {
                const [min, max] = RANGES[k];
                const el = ELEMENTS[k];
                const QC_OPT: Record<ElKey, [number, number]> = {
                  Al: [62, 72],
                  Cu: [10, 20],
                  Fe: [10, 15],
                  Mn: [2, 6],
                };
                const [lo, hi] = QC_OPT[k];
                const v = comp[k];
                const dist = v < lo ? lo - v : v > hi ? v - hi : 0;
                const borderColor = dist === 0 ? "#22C55E" : dist <= 2 ? "#F59E0B" : "#EF4444";
                const hint = `Typical QC range: ${lo}–${hi} at%`;
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-sm font-medium">
                        <span style={{ color: el.color }}>{k}</span>{" "}
                        <span className="text-muted-foreground">— {el.name}</span>
                      </label>
                      <span className="data-mono text-[10px]" style={{ color: borderColor }}>
                        {dist === 0 ? "✓ optimal" : dist <= 2 ? "⚠ near" : "✗ outside"}
                      </span>
                    </div>
                    {mode === "literature" ? (
                      <input
                        type="number"
                        step={0.1}
                        value={Number(comp[k].toFixed(2))}
                        onChange={(e) => handleNumber(k, parseFloat(e.target.value))}
                        className="w-full rounded-md border bg-secondary/40 px-3 py-1.5 data-mono text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                        style={{ borderColor: borderColor + "88" }}
                      />
                    ) : (
                      <>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={0.1}
                          value={comp[k]}
                          onChange={(e) => handleSlider(k, parseFloat(e.target.value))}
                          className="w-full accent-primary"
                          style={{ accentColor: borderColor }}
                        />
                        <div className="flex justify-between data-mono text-[10px] text-muted-foreground">
                          <span>{min}</span>
                          <span style={{ color: borderColor }}>{comp[k].toFixed(1)} at%</span>
                          <span>{max}</span>
                        </div>
                      </>
                    )}
                    <div className="data-mono text-[9px] text-muted-foreground/80 mt-0.5">{hint}</div>
                  </div>
                );
              })}
            </div>


            {/* Total badge */}
            <div
              className="mt-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm data-mono"
              style={{
                borderColor: totalBadge.color + "55",
                background: totalBadge.bg,
                color: totalBadge.color,
              }}
            >
              <span>Total</span>
              <span>{totalBadge.text}</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {totalDiff >= 0.1 ? (
                <button
                  onClick={() => {
                    setComp(autoNormalize(comp));
                    setSource("Manual");
                  }}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  Auto-normalize
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={resetComp}
                className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              >
                Reset
              </button>
            </div>


            {/* Descriptors */}
            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Derived descriptors
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DescCard label="e/a ratio" value={desc.e_a.toFixed(3)} hint="Target 1.86" />
                <DescCard label="VEC" value={desc.vec.toFixed(3)} hint="Valence e⁻ conc." />
                <DescCard label="Avg. EN" value={desc.en.toFixed(3)} hint="Pauling" />
                <DescCard label="Avg. radius" value={`${desc.radius.toFixed(1)}`} hint="pm" />
                <DescCard label="δ (size mismatch)" value={`${desc.delta.toFixed(2)}%`} hint="Low δ → solid sol." />
                <DescCard label="ΔS_mix" value={desc.entropy.toFixed(2)} hint="J/mol·K" />
              </div>
            </div>
          </section>

          {/* PANEL 2 — PREDICTION */}
          <section className="lg:col-span-5 rounded-xl border border-border bg-card p-5">
            <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 02</div>
            <h2 className="text-lg font-semibold">Phase Prediction Result</h2>
            <p className="text-sm text-muted-foreground mb-3">Heuristic rule-based inference</p>
            <div className="mb-4">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                title="Rule-based predictions from established QC formation criteria. ML model integration in development."
              >
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                Heuristic Engine
              </span>
            </div>

            <div
              key={pulseKey}
              className="rounded-xl border p-5 animate-scale-in"
              style={{
                borderColor: pred.color + "55",
                background: `linear-gradient(135deg, ${pred.color}14, transparent)`,
                boxShadow: pred.kind !== "INVALID" ? `0 0 24px -8px ${pred.color}55` : "none",
                transition: "box-shadow 300ms ease, border-color 300ms ease",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: pred.color + "22",
                    color: pred.color,
                    border: `1px solid ${pred.color}44`,
                  }}
                >
                  <span className="text-base leading-none">{pred.icon}</span>
                  {pred.kind === "QC"
                    ? "QC POSITIVE"
                    : pred.kind === "APPROX"
                      ? "APPROXIMANT"
                      : pred.kind === "ORDINARY"
                        ? "NON-QC"
                        : "INVALID INPUT"}
                </span>
                <div className="flex items-center gap-2">
                  {loadedFrom && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Reference: {loadedFrom}
                    </span>
                  )}
                  <span className="data-mono text-xs text-muted-foreground">
                    Al{comp.Al.toFixed(0)}Cu{comp.Cu.toFixed(0)}Fe{comp.Fe.toFixed(0)}Mn{comp.Mn.toFixed(0)}
                  </span>
                </div>
              </div>

              <h3 className="mt-4 text-3xl font-bold flex items-center gap-3" style={{ color: pred.color }}>
                <span className="text-4xl">{pred.icon}</span>
                {pred.label}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{pred.reasoning}</p>


              {pred.kind !== "INVALID" && (
                <div className="mt-5 flex items-center gap-5">
                  <ArcGauge value={pred.confidence} color={pred.color} />
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Confidence
                    </div>
                    <div className="data-mono text-2xl font-bold" style={{ color: pred.color }}>
                      {pred.confidence.toFixed(1)}%
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Hume-Rothery e/a:{" "}
                      <span
                        className="data-mono"
                        style={{
                          color:
                            desc.e_a >= 1.8 && desc.e_a <= 1.95
                              ? "#22C55E"
                              : desc.e_a >= 1.75 && desc.e_a <= 2.1
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      >
                        {desc.e_a.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {pred.warning && (
                <div className="mt-4 rounded-md border px-3 py-2 text-xs" style={{ borderColor: "#F59E0B66", background: "#F59E0B14", color: "#F59E0B" }}>
                  ⚠ {pred.warning}
                </div>
              )}

              {pred.kind === "QC" && <QCTypeIndicator />}
            </div>

            {pred.kind !== "INVALID" && (
              <AIAnalysis
                comp={comp}
                phase={pred.label}
                confidence={pred.confidence}
                e_a={desc.e_a}
                stabilityPassed={stability.passed}
                api={props.antibacterial}
              />
            )}

            {/* Hume-Rothery gauge */}
            <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Hume-Rothery e/a Stability Window</span>
                <span className="data-mono text-sm text-primary">e/a = {desc.e_a.toFixed(3)}</span>
              </div>
              <HumeRotheryBar value={desc.e_a} />
              <div className="mt-2 flex justify-between data-mono text-[10px] text-muted-foreground">
                <span>1.50</span>
                <span>1.75</span>
                <span className="text-qc-positive">1.86★</span>
                <span>2.10</span>
                <span>2.30</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Ideal icosahedral QC: e/a ≈ 1.86
              </div>
            </div>

            {/* Element Cards */}
            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Element breakdown
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ELEMENTS) as ElKey[]).map((k) => {
                  const el = ELEMENTS[k];
                  const glow = pred.kind === "INVALID" ? "transparent" : pred.color;
                  return (
                    <div
                      key={k}
                      className="rounded-lg border bg-secondary/40 p-3 transition"
                      style={{
                        borderColor: pred.kind === "INVALID" ? "" : glow + "55",
                        boxShadow: pred.kind === "INVALID" ? "none" : `0 0 14px -4px ${glow}55`,
                      }}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold" style={{ color: el.color }}>
                          {k}
                        </span>
                        <span className="data-mono text-sm text-primary">
                          {comp[k].toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground data-mono">
                        <div>EN: {el.en}</div>
                        <div>r: {el.radius} pm</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* PANEL 3 — VISUALIZATION + PRESETS */}
          <section className="lg:col-span-3 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 03</div>
              <h2 className="text-sm font-semibold mb-2">Composition Radar</h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#1E293B" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    <Radar
                      name="QC zone"
                      dataKey="ref"
                      stroke="#38BDF8"
                      fill="#38BDF8"
                      fillOpacity={0.1}
                      strokeDasharray="3 3"
                    />
                    <Radar
                      name="Composition"
                      dataKey="value"
                      stroke={pred.color}
                      fill={pred.color}
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PRESETS */}
            <div className="rounded-xl border border-border bg-card">
              <button
                onClick={() => setShowPresets((s) => !s)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary">Presets</div>
                  <h2 className="text-sm font-semibold">Known Literature Compositions</h2>
                </div>
                <span className="text-muted-foreground">{showPresets ? "▾" : "▸"}</span>
              </button>
              {showPresets && (
                <div className="space-y-3 px-4 pb-4">
                  {PRESETS.map((group) => {
                    const c =
                      group.category === "QC"
                        ? "#22C55E"
                        : group.category === "APPROX"
                          ? "#F59E0B"
                          : "#EF4444";
                    return (
                      <div key={group.category}>
                        <div
                          className="mb-1 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: c }}
                        >
                          {group.title}
                        </div>
                        <div className="space-y-1">
                          {group.items.map((p) => (
                            <div
                              key={p.label}
                              className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-2 py-1.5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-medium">{p.label}</div>
                                <div className="data-mono text-[10px] text-muted-foreground">
                                  Al{p.comp.Al} Cu{p.comp.Cu} Fe{p.comp.Fe} Mn{p.comp.Mn}
                                </div>
                              </div>
                              <button
                                onClick={() => loadPreset(p)}
                                className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20"
                              >
                                Load
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* XRD sits right next to the prediction so users see the diffraction
              signature of the phase without scrolling */}
          <div className="lg:col-span-12">
            <XRDVisualizer phaseKind={pred.kind === "INVALID" ? "ORDINARY" : pred.kind} cntYield={pred.kind === "QC" ? 20 : 0} />
          </div>

          {/* Properties group — predicted material behavior */}
          <PropertiesPanel props={props} />
          <StabilityPanel data={stability} />
          <TsaiRulesPanel comp={comp} desc={{ e_a: desc.e_a, delta: desc.delta }} />

          {/* Surface / CNT group — leaching feeds CNT growth, keep together */}
          <LeachingPanel comp={comp} isQC={pred.kind === "QC"} naoh={naoh} setNaoh={setNaoh} />
          <div className="lg:col-span-12">
            <CNTPredictor comp={comp} />
          </div>

          {/* Exploration group — what-if tools */}
          <DopantExplorer
            currentComp={comp}
            currentEa={desc.e_a}
            currentPhase={pred.label}
            currentConf={pred.confidence}
            currentApi={props.antibacterial}
            predictFromExt={predictFromExt}
          />
          <ComparisonPanel
            slots={slots}
            saveSlot={saveSlot}
            clearSlot={clearSlot}
            currentSlot={currentSlot}
          />

          {/* Session history */}
          <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setShowHistory((s) => !s)}
                className="flex items-center gap-2 text-left"
              >
                <span className="text-muted-foreground">{showHistory ? "▾" : "▸"}</span>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 04</div>
                  <h2 className="text-lg font-semibold">
                    📋 Session History ({history.length} composition{history.length !== 1 ? "s" : ""})
                  </h2>
                </div>
              </button>
              <div className="flex flex-wrap gap-2">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)}
                  className="rounded-md border border-border bg-secondary px-2 py-1 text-xs"
                >
                  <option value="ALL">All phases</option>
                  <option value="QC">QC only</option>
                  <option value="APPROX">Approximant only</option>
                  <option value="ORDINARY">Non-QC only</option>
                </select>
                <button
                  onClick={() => {
                    const arr = history.map((r) => ({
                      Al: +r.comp.Al.toFixed(2),
                      Cu: +r.comp.Cu.toFixed(2),
                      Fe: +r.comp.Fe.toFixed(2),
                      Mn: +r.comp.Mn.toFixed(2),
                      e_a: +r.e_a.toFixed(3),
                      phase: r.pred.kind,
                      confidence: +r.pred.confidence.toFixed(1),
                      source: r.source,
                    }));
                    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `qc_session_${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
                >
                  Export JSON
                </button>
                <button
                  onClick={exportCSV}
                  className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
                >
                  📥 Export CSV
                </button>
                <button
                  onClick={() => setHistory([])}
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
                >
                  Clear
                </button>
              </div>
            </div>


            {showHistory && (
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 320 }}>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-right">Al</th>
                    <th className="px-2 py-2 text-right">Cu</th>
                    <th className="px-2 py-2 text-right">Fe</th>
                    <th className="px-2 py-2 text-right">Mn</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-2 py-2 text-right">e/a</th>
                    <th className="px-2 py-2 text-left">Predicted Phase</th>
                    <th className="px-2 py-2 text-right">Conf%</th>
                    <th className="px-2 py-2 text-left">Input Method</th>
                  </tr>
                </thead>
                <tbody className="data-mono">
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-2 py-6 text-center text-muted-foreground">
                        Adjust composition or load a preset to begin logging predictions.
                      </td>
                    </tr>
                  )}
                  {[...history]
                    .reverse()
                    .filter((r) => historyFilter === "ALL" || r.pred.kind === historyFilter)
                    .map((r) => {
                      const isBest = bestQC?.id === r.id;
                      const tot = r.comp.Al + r.comp.Cu + r.comp.Fe + r.comp.Mn;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => reloadFromHistory(r)}
                          title="Click to reload this composition"
                          className={`border-b border-border/50 hover:bg-secondary/30 cursor-pointer ${
                            isBest ? "bg-qc-positive/10" : ""
                          }`}
                          style={{ borderLeft: `3px solid ${r.pred.color}` }}
                        >
                          <td className="px-2 py-1.5">
                            {r.id}
                            {isBest && <span className="ml-1 text-qc-positive">★</span>}
                          </td>
                          <td className="px-2 py-1.5 text-right">{r.comp.Al.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-right">{r.comp.Cu.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-right">{r.comp.Fe.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-right">{r.comp.Mn.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-right">{tot.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-right">{r.e_a.toFixed(3)}</td>
                          <td className="px-2 py-1.5 text-left font-sans" style={{ color: r.pred.color }}>
                            {r.pred.label}
                          </td>
                          <td className="px-2 py-1.5 text-right">{r.pred.confidence.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-left text-muted-foreground font-sans">
                            {r.source === "Literature" ? "Reference Composition" : "User-Defined"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            )}

            {bestQC && (
              <div className="mt-3 text-xs text-qc-positive">
                ★ Best QC candidate: #{bestQC.id} — Al{bestQC.comp.Al.toFixed(1)} Cu
                {bestQC.comp.Cu.toFixed(1)} Fe{bestQC.comp.Fe.toFixed(1)} Mn
                {bestQC.comp.Mn.toFixed(1)} ({bestQC.pred.confidence.toFixed(1)}% confidence)
              </div>
            )}
          </section>

          {/* Export */}
          <ExportPanel buildReportHTML={buildReportHTML} bibtex={bibtex} pythonDict={pythonDict} />

          {/* Heat treatment / phase evolution */}
          <HeatTreatmentPanel comp={comp} predKind={pred.kind} />

          {/* 600°C isothermal annealing data */}
          <Annealing600CPanel />

          {/* Co substitution phase map */}
          <CoSubstitutionPanel />

          {/* RAG knowledge base — chunks injected into AI Analysis */}
          <KnowledgeBasePanel />

          {/* Reference / literature group at bottom */}
          <ReferenceDataset loadExternalComp={loadExternalComp} predictFromExt={predictFromExt} />
          <MLDiscoveryPanel loadComp={loadExternalComp} />
          <ReferencesPanel />
        </div>



        <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <p>
            QC Phase Predictor v2.0 | Based on HYPOD-X Database (Fujita et al., 2024) and Ali et al. (2025)
          </p>
          <p className="mt-1">
            Predictions are generated by rule-based heuristics derived from established
            quasicrystal formation criteria. A Random Forest classifier trained on the
            HYPOD-X compositional database is currently under development.
          </p>
          <p className="mt-1 italic">For research guidance only — experimental validation required.</p>
        </footer>
      </main>
    </div>
  );
}

// ============ SUB-COMPONENTS ============
function DescCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="data-mono text-base font-semibold text-primary">{value}</div>
      {hint && <div className="text-[9px] text-muted-foreground/80 mt-0.5">{hint}</div>}
    </div>
  );
}

function ArcGauge({ value, color }: { value: number; color: string }) {
  const r = 36;
  const c = Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  const offset = c - (v / 100) * c;
  return (
    <svg width="100" height="60" viewBox="0 0 100 60">
      <path d={`M 10 55 A ${r} ${r} 0 0 1 90 55`} fill="none" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
      <path
        d={`M 10 55 A ${r} ${r} 0 0 1 90 55`}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        fontSize="14"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="700"
        fill={color}
      >
        {Math.round(v)}
      </text>
    </svg>
  );
}

function HumeRotheryBar({ value }: { value: number }) {
  const min = 1.5;
  const max = 2.3;
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  const seg = (a: number, b: number) => ({
    left: `${((a - min) / (max - min)) * 100}%`,
    width: `${((b - a) / (max - min)) * 100}%`,
  });
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
      <div className="absolute inset-y-0" style={{ ...seg(min, 1.75), background: "#EF444433" }} />
      <div className="absolute inset-y-0" style={{ ...seg(1.75, 1.8), background: "#F59E0B44" }} />
      <div className="absolute inset-y-0" style={{ ...seg(1.8, 1.95), background: "#22C55E55" }} />
      <div className="absolute inset-y-0" style={{ ...seg(1.95, 2.1), background: "#F59E0B44" }} />
      <div className="absolute inset-y-0" style={{ ...seg(2.1, max), background: "#EF444433" }} />
      <div
        className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-lg"
        style={{ left: `${pct}%`, transition: "left 0.3s ease" }}
      />
    </div>
  );
}
