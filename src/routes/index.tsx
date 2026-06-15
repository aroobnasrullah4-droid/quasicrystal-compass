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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QC Phase Predictor — Al-Cu-Fe-Mn Quasicrystal Tool" },
      {
        name: "description",
        content:
          "Predict quasicrystalline phase formation in Al-Cu-Fe-Mn alloys using rule-based heuristics. PIEAS FYP.",
      },
    ],
  }),
  component: QCPredictor,
});

// ============ ELEMENT DATA ============
const ELEMENTS = {
  Al: { name: "Aluminum", valence: 3, vec: 3, en: 1.61, radius: 143, color: "#94a3b8" },
  Cu: { name: "Copper", valence: 1, vec: 11, en: 1.9, radius: 128, color: "#f97316" },
  Fe: { name: "Iron", valence: 8, vec: 8, en: 1.83, radius: 126, color: "#a78bfa" },
  Mn: { name: "Manganese", valence: 7, vec: 7, en: 1.55, radius: 127, color: "#ec4899" },
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
      { label: "Tsai Classic", comp: { Al: 65, Cu: 20, Fe: 10, Mn: 5 }, note: "Tsai et al. benchmark" },
      { label: "Sir Fahad System", comp: { Al: 63, Cu: 18, Fe: 12, Mn: 7 }, note: "SSRN 2025" },
      { label: "Al-rich QC", comp: { Al: 70, Cu: 12, Fe: 13, Mn: 5 }, note: "High Al variant" },
      { label: "High-Cu QC", comp: { Al: 62, Cu: 20, Fe: 13, Mn: 5 }, note: "High Cu variant" },
      { label: "Standard QC", comp: { Al: 68, Cu: 15, Fe: 11, Mn: 6 }, note: "Literature standard" },
    ],
  },
  {
    category: "APPROX",
    title: "⚠ Approximant / Borderline",
    items: [
      { label: "High Mn", comp: { Al: 63, Cu: 17, Fe: 12, Mn: 8 }, note: "β-Mn risk" },
      { label: "Low Al", comp: { Al: 58, Cu: 22, Fe: 13, Mn: 7 }, note: "Al below threshold" },
      { label: "Mn Limit", comp: { Al: 65, Cu: 18, Fe: 10, Mn: 7 }, note: "Mn at boundary" },
    ],
  },
  {
    category: "ORDINARY",
    title: "✗ Non-QC / Ordinary Crystal",
    items: [
      { label: "Al-excess", comp: { Al: 80, Cu: 8, Fe: 8, Mn: 4 }, note: "Al far too high" },
      { label: "Al-deficient", comp: { Al: 55, Cu: 25, Fe: 15, Mn: 5 }, note: "Al too low" },
      { label: "Fe-deficient", comp: { Al: 65, Cu: 20, Fe: 5, Mn: 10 }, note: "Fe low, Mn excessive" },
    ],
  },
];

// ============ CALCULATIONS ============
function computeDescriptors(c: Comp) {
  const total = c.Al + c.Cu + c.Fe + c.Mn;
  const e_a = (c.Al * 3 + c.Cu * 1 + c.Fe * 8 + c.Mn * 7) / 100;
  const en = (c.Al * 1.61 + c.Cu * 1.9 + c.Fe * 1.83 + c.Mn * 1.55) / 100;
  const radius = (c.Al * 143 + c.Cu * 128 + c.Fe * 126 + c.Mn * 127) / 100;
  const vec = (c.Al * 3 + c.Cu * 11 + c.Fe * 8 + c.Mn * 7) / 100;
  return { e_a, en, radius, vec, total };
}

type PredKind = "QC" | "APPROX" | "ORDINARY" | "INVALID";
interface Prediction {
  kind: PredKind;
  label: string;
  confidence: number;
  color: string;
  reasoning: string;
  warning?: string;
}

function predict(c: Comp, e_a: number, total: number): Prediction {
  if (total < 98 || total > 102) {
    return {
      kind: "INVALID",
      label: "Enter valid composition to predict",
      confidence: 0,
      color: "#64748B",
      reasoning: `Total must be 98–102%. Current total = ${total.toFixed(1)}%`,
    };
  }
  const { Al, Cu, Fe, Mn } = c;
  const warning = Mn > 6 ? "High Mn content (>6 at%) — competing β-Mn phase risk" : undefined;

  if (Al >= 62 && Al <= 72 && Cu >= 10 && Cu <= 20 && Fe >= 10 && Fe <= 15 && Mn >= 2 && Mn <= 6) {
    const proximity = Math.max(0, 1 - Math.abs(e_a - 1.86) / 0.2);
    const confidence = Math.min(95, 70 + proximity * 25);
    return {
      kind: "QC",
      label: "Quasicrystalline Phase",
      confidence,
      color: "#22C55E",
      reasoning: `Rule QC matched: Al 62-72, Cu 10-20, Fe 10-15, Mn 2-6 — e/a = ${e_a.toFixed(2)} (target 1.86)`,
      warning,
    };
  }
  if (Al >= 58 && Al <= 72 && Cu >= 8 && Cu <= 20 && Fe >= 8 && Fe <= 15 && Mn >= 6 && Mn <= 9) {
    const proximity = Math.max(0, 1 - Math.abs(e_a - 1.86) / 0.25);
    const confidence = 45 + proximity * 15;
    return {
      kind: "APPROX",
      label: "Approximant Crystal",
      confidence,
      color: "#F59E0B",
      reasoning: "Rule APPROX matched: borders QC field but high Mn favors periodic approximant",
      warning: warning ?? "Periodic approximant structure expected",
    };
  }
  const dist =
    Math.max(0, Math.max(58 - Al, Al - 72)) +
    Math.max(0, Math.max(8 - Cu, Cu - 20)) +
    Math.max(0, Math.max(8 - Fe, Fe - 15)) +
    Math.max(0, Math.max(0 - Mn, Mn - 9));
  const confidence = Math.max(15, 35 - dist * 1.5);
  return {
    kind: "ORDINARY",
    label: "Ordinary Crystal / Multi-phase",
    confidence,
    color: "#EF4444",
    reasoning: `Composition outside known QC stability field (e/a = ${e_a.toFixed(2)})`,
    warning,
  };
}

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

  const desc = useMemo(() => computeDescriptors(comp), [comp]);
  const pred = useMemo(() => predict(comp, desc.e_a, desc.total), [comp, desc]);

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

  const handleSlider = (k: ElKey, v: number) => setComp((p) => normalizeOnChange(p, k, v));
  const handleNumber = (k: ElKey, v: number) => {
    setComp((p) => ({ ...p, [k]: isNaN(v) ? 0 : Math.max(0, v) }));
    setSource("Manual");
  };

  const loadPreset = (p: Preset) => {
    setComp({ ...p.comp });
    setMode("literature");
    setSource("Literature");
  };

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

  const copyColab = () => {
    const arr = history.map((r) => ({
      Al: +r.comp.Al.toFixed(2),
      Cu: +r.comp.Cu.toFixed(2),
      Fe: +r.comp.Fe.toFixed(2),
      Mn: +r.comp.Mn.toFixed(2),
      phase: r.pred.kind,
      confidence: +r.pred.confidence.toFixed(1),
    }));
    const py = `compositions = ${JSON.stringify(arr)}\n\nimport pandas as pd\ndf = pd.DataFrame(compositions)\nprint(df.head())`;
    navigator.clipboard?.writeText(py);
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
                    ML-Inspired Quasicrystal Composition Tool — Al-Cu-Fe-Mn System
                  </p>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="data-mono text-primary">PIEAS FYP Research Tool</span>
                <span className="text-muted-foreground">| MME Department</span>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-border bg-secondary hover:bg-secondary/80">
                  About
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>About QC Phase Predictor</DialogTitle>
                  <DialogDescription className="text-muted-foreground pt-2 space-y-2">
                    <span className="block">
                      A rule-based prototype for predicting quasicrystalline phase formation in the
                      Al-Cu-Fe-Mn quaternary system, developed at PIEAS.
                    </span>
                    <span className="block">
                      Heuristics derived from the Hume-Rothery electron concentration rule and known
                      Tsai-type icosahedral phase fields. Real ML integration (HYPOD-X) is planned.
                    </span>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
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
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-sm font-medium">
                        <span style={{ color: el.color }}>{k}</span>{" "}
                        <span className="text-muted-foreground">— {el.name}</span>
                      </label>
                      <span className="data-mono text-[10px] text-muted-foreground">
                        hint {min}-{max}
                      </span>
                    </div>
                    {mode === "literature" ? (
                      <input
                        type="number"
                        step={0.1}
                        value={Number(comp[k].toFixed(2))}
                        onChange={(e) => handleNumber(k, parseFloat(e.target.value))}
                        className="w-full rounded-md border border-border bg-secondary/40 px-3 py-1.5 data-mono text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                        />
                        <div className="flex justify-between data-mono text-[10px] text-muted-foreground">
                          <span>{min}</span>
                          <span className="text-primary">{comp[k].toFixed(1)} at%</span>
                          <span>{max}</span>
                        </div>
                      </>
                    )}
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

            {totalDiff >= 0.1 && (
              <button
                onClick={() => {
                  setComp(autoNormalize(comp));
                  setSource("Manual");
                }}
                className="mt-2 w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                Auto-normalize to 100%
              </button>
            )}

            {/* Descriptors */}
            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Derived descriptors
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DescCard label="e/a ratio" value={desc.e_a.toFixed(3)} />
                <DescCard label="VEC" value={desc.vec.toFixed(3)} />
                <DescCard label="Avg. EN" value={desc.en.toFixed(3)} />
                <DescCard label="Avg. radius" value={`${desc.radius.toFixed(1)} pm`} />
              </div>
            </div>
          </section>

          {/* PANEL 2 — PREDICTION */}
          <section className="lg:col-span-5 rounded-xl border border-border bg-card p-5">
            <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 02</div>
            <h2 className="text-lg font-semibold">Phase Prediction Result</h2>
            <p className="text-sm text-muted-foreground mb-4">Heuristic rule-based inference</p>

            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: pred.color + "55",
                background: `linear-gradient(135deg, ${pred.color}14, transparent)`,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: pred.color + "22",
                    color: pred.color,
                    border: `1px solid ${pred.color}44`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: pred.color }} />
                  {pred.kind === "QC"
                    ? "QC POSITIVE"
                    : pred.kind === "APPROX"
                      ? "APPROXIMANT"
                      : pred.kind === "ORDINARY"
                        ? "NON-QC"
                        : "INVALID INPUT"}
                </span>
                <span className="data-mono text-xs text-muted-foreground">
                  Al{comp.Al.toFixed(0)}Cu{comp.Cu.toFixed(0)}Fe{comp.Fe.toFixed(0)}Mn{comp.Mn.toFixed(0)}
                </span>
              </div>

              <h3 className="mt-4 text-3xl font-bold" style={{ color: pred.color }}>
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
            </div>

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

          {/* PANEL 4 — HISTORY */}
          <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 04</div>
                <h2 className="text-lg font-semibold">Session History</h2>
                <p className="text-xs text-muted-foreground">
                  {history.length} composition{history.length !== 1 ? "s" : ""} tested this session
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copyColab}
                  className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
                >
                  Copy to Colab
                </button>
                <button
                  onClick={exportCSV}
                  className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setHistory([])}
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
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
                    <th className="px-2 py-2 text-left">Source</th>
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
                  {[...history].reverse().map((r) => {
                    const isBest = bestQC?.id === r.id;
                    const tot = r.comp.Al + r.comp.Cu + r.comp.Fe + r.comp.Mn;
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-border/50 hover:bg-secondary/30 ${
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
                        <td
                          className="px-2 py-1.5 text-left font-sans"
                          style={{ color: r.pred.color }}
                        >
                          {r.pred.label}
                        </td>
                        <td className="px-2 py-1.5 text-right">{r.pred.confidence.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-left text-muted-foreground font-sans">
                          {r.source}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {bestQC && (
              <div className="mt-3 text-xs text-qc-positive">
                ★ Best QC candidate: #{bestQC.id} — Al{bestQC.comp.Al.toFixed(1)} Cu
                {bestQC.comp.Cu.toFixed(1)} Fe{bestQC.comp.Fe.toFixed(1)} Mn
                {bestQC.comp.Mn.toFixed(1)} ({bestQC.pred.confidence.toFixed(1)}% confidence)
              </div>
            )}
          </section>
        </div>

        <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Rule-based prototype for a Random Forest ML model being trained on the HYPOD-X
          quasicrystal database (2024). Predictions are research guidance only — experimental
          validation required. PIEAS MME FYP 2025–26.
        </footer>
      </main>
    </div>
  );
}

// ============ SUB-COMPONENTS ============
function DescCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="data-mono text-base font-semibold text-primary">{value}</div>
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
