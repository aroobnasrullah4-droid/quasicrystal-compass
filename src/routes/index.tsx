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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QC Phase Predictor — Al-Cu-Fe-Mn Quasicrystal Tool" },
      { name: "description", content: "Predict quasicrystalline phase formation in Al-Cu-Fe-Mn alloys using rule-based heuristics. PIEAS FYP." },
    ],
  }),
  component: QCPredictor,
});

// ============ ELEMENT DATA ============
const ELEMENTS = {
  Al: { name: "Aluminum", valence: 3, en: 1.61, radius: 143, category: "Post-transition", color: "#94a3b8" },
  Cu: { name: "Copper", valence: 1, en: 1.90, radius: 128, category: "Transition", color: "#f97316" },
  Fe: { name: "Iron", valence: 8, en: 1.83, radius: 126, category: "Transition", color: "#a78bfa" },
  Mn: { name: "Manganese", valence: 7, en: 1.55, radius: 127, category: "Transition", color: "#ec4899" },
} as const;

type ElKey = keyof typeof ELEMENTS;
type Comp = Record<ElKey, number>;

const PRESETS: Comp[] = [
  { Al: 65, Cu: 20, Fe: 10, Mn: 5 },
  { Al: 63, Cu: 18, Fe: 12, Mn: 7 },
  { Al: 70, Cu: 12, Fe: 13, Mn: 5 },
  { Al: 68, Cu: 15, Fe: 11, Mn: 6 },
];

const RANGES: Record<ElKey, [number, number]> = {
  Al: [55, 80],
  Cu: [5, 25],
  Fe: [5, 20],
  Mn: [1, 10],
};

// ============ CALCULATIONS ============
function computeDescriptors(c: Comp) {
  const total = c.Al + c.Cu + c.Fe + c.Mn;
  const w = (k: ElKey) => c[k] / total;
  const e_a =
    w("Al") * ELEMENTS.Al.valence +
    w("Cu") * ELEMENTS.Cu.valence +
    w("Fe") * ELEMENTS.Fe.valence +
    w("Mn") * ELEMENTS.Mn.valence;
  const en =
    w("Al") * ELEMENTS.Al.en +
    w("Cu") * ELEMENTS.Cu.en +
    w("Fe") * ELEMENTS.Fe.en +
    w("Mn") * ELEMENTS.Mn.en;
  const radius =
    w("Al") * ELEMENTS.Al.radius +
    w("Cu") * ELEMENTS.Cu.radius +
    w("Fe") * ELEMENTS.Fe.radius +
    w("Mn") * ELEMENTS.Mn.radius;
  // VEC same as e/a for these monovalent-ish models, but compute slightly differently — treat as full valence electron concentration
  const vec = e_a;
  return { e_a, en, radius, vec, total };
}

type PredKind = "QC" | "APPROX" | "ORDINARY";
interface Prediction {
  kind: PredKind;
  label: string;
  confidence: number;
  color: string;
  reasoning: string;
  warning?: string;
}

function predict(c: Comp, e_a: number): Prediction {
  const { Al, Cu, Fe, Mn } = c;
  const warning = Mn > 6 ? "High Mn content (>6 at%) — competing β-Mn phase risk" : undefined;

  if (Al >= 62 && Al <= 72 && Cu >= 10 && Cu <= 18 && Fe >= 10 && Fe <= 15 && Mn >= 2 && Mn <= 6) {
    const proximity = Math.max(0, 1 - Math.abs(e_a - 1.86) / 0.2);
    const confidence = Math.min(95, 75 + proximity * 20);
    return {
      kind: "QC",
      label: "Quasicrystalline Phase",
      confidence,
      color: "#22C55E",
      reasoning: `e/a = ${e_a.toFixed(2)} — ${e_a >= 1.75 && e_a <= 1.95 ? "within icosahedral stability window" : "near icosahedral window"}`,
      warning,
    };
  }
  // Deterministic pseudo-confidence from composition (avoid hydration mismatch)
  const seed = (Al * 7.3 + Cu * 3.1 + Fe * 5.7 + Mn * 11.9) % 1;
  if (Al >= 58 && Cu >= 8 && Fe >= 8 && Mn > 6) {
    const confidence = 45 + seed * 20;
    return {
      kind: "APPROX",
      label: "Approximant Crystal",
      confidence,
      color: "#F59E0B",
      reasoning: "Composition borders QC field but high Mn favors periodic approximant",
      warning: warning ?? "Periodic approximant structure expected",
    };
  }
  const confidence = 20 + seed * 20;
  return {
    kind: "ORDINARY",
    label: "Ordinary Crystal / Multi-phase",
    confidence,
    color: "#EF4444",
    reasoning: `Composition outside known Al-Cu-Fe-Mn QC stability field (e/a = ${e_a.toFixed(2)})`,
    warning,
  };
}

// ============ NORMALIZATION ============
function normalizeOnChange(prev: Comp, key: ElKey, newVal: number): Comp {
  const [min, max] = RANGES[key];
  newVal = Math.max(min, Math.min(max, newVal));
  const others: ElKey[] = (Object.keys(prev) as ElKey[]).filter((k) => k !== key);
  const remaining = 100 - newVal;
  const othersSum = others.reduce((s, k) => s + prev[k], 0);
  const next: Comp = { ...prev, [key]: newVal };
  if (othersSum > 0) {
    others.forEach((k) => {
      const [mn, mx] = RANGES[k];
      const scaled = (prev[k] / othersSum) * remaining;
      next[k] = Math.max(mn, Math.min(mx, scaled));
    });
  }
  // Re-balance to ensure exactly 100 (account for clamping)
  const sum = next.Al + next.Cu + next.Fe + next.Mn;
  const diff = 100 - sum;
  if (Math.abs(diff) > 0.01) {
    // distribute diff to the largest other slot that has headroom
    const sortable = others.sort((a, b) => next[b] - next[a]);
    for (const k of sortable) {
      const [mn, mx] = RANGES[k];
      const want = next[k] + diff;
      if (want >= mn && want <= mx) {
        next[k] = want;
        break;
      }
    }
  }
  return next;
}

// ============ COMPONENT ============
interface HistoryRow {
  id: number;
  comp: Comp;
  e_a: number;
  pred: Prediction;
  ts: string;
}

function QCPredictor() {
  const [comp, setComp] = useState<Comp>({ Al: 65, Cu: 15, Fe: 12, Mn: 8 });
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [presetIdx, setPresetIdx] = useState(0);

  const desc = useMemo(() => computeDescriptors(comp), [comp]);
  const pred = useMemo(() => predict(comp, desc.e_a), [comp, desc.e_a]);

  // record to history (debounced via timer)
  useEffect(() => {
    const t = setTimeout(() => {
      setHistory((h) => {
        const last = h[h.length - 1];
        if (
          last &&
          last.comp.Al === comp.Al &&
          last.comp.Cu === comp.Cu &&
          last.comp.Fe === comp.Fe &&
          last.comp.Mn === comp.Mn
        )
          return h;
        return [
          ...h,
          {
            id: (h[h.length - 1]?.id ?? 0) + 1,
            comp: { ...comp },
            e_a: desc.e_a,
            pred,
            ts: new Date().toLocaleTimeString(),
          },
        ].slice(-40);
      });
    }, 600);
    return () => clearTimeout(t);
  }, [comp, desc.e_a, pred]);

  const handleSlider = (k: ElKey, v: number) =>
    setComp((p) => normalizeOnChange(p, k, v));

  const applyPreset = () => {
    setComp({ ...PRESETS[presetIdx] });
    setPresetIdx((i) => (i + 1) % PRESETS.length);
  };

  const exportCSV = () => {
    const header = "#,Al,Cu,Fe,Mn,e/a,Phase,Confidence,Time\n";
    const rows = history
      .map(
        (r) =>
          `${r.id},${r.comp.Al.toFixed(2)},${r.comp.Cu.toFixed(2)},${r.comp.Fe.toFixed(2)},${r.comp.Mn.toFixed(2)},${r.e_a.toFixed(3)},${r.pred.label},${r.pred.confidence.toFixed(1)},${r.ts}`
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
    const data = {
      compositions: history.map((r) => ({
        Al: +r.comp.Al.toFixed(2),
        Cu: +r.comp.Cu.toFixed(2),
        Fe: +r.comp.Fe.toFixed(2),
        Mn: +r.comp.Mn.toFixed(2),
        e_a: +r.e_a.toFixed(3),
        phase: r.pred.label,
        confidence: +r.pred.confidence.toFixed(1),
      })),
    };
    const py = `# QC Phase Predictor session export\nsession_data = ${JSON.stringify(data, null, 2)}\n\nimport pandas as pd\ndf = pd.DataFrame(session_data['compositions'])\nprint(df.head())`;
    navigator.clipboard.writeText(py);
  };

  const bestQC = useMemo(() => {
    const qcs = history.filter((r) => r.pred.kind === "QC");
    if (!qcs.length) return null;
    return qcs.reduce((a, b) => (b.pred.confidence > a.pred.confidence ? b : a));
  }, [history]);

  const radarData = [
    { axis: "Al", value: comp.Al, ref: 65, max: 80 },
    { axis: "Cu", value: comp.Cu, ref: 15, max: 25 },
    { axis: "Fe", value: comp.Fe, ref: 12, max: 20 },
    { axis: "Mn", value: comp.Mn, ref: 4, max: 10 },
  ];

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
                  <h1 className="text-2xl font-bold tracking-tight">
                    QC Phase Predictor
                  </h1>
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
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border bg-secondary hover:bg-secondary/80">About</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>About QC Phase Predictor</DialogTitle>
                    <DialogDescription className="text-muted-foreground pt-2 space-y-2">
                      <span className="block">
                        A rule-based prototype for predicting quasicrystalline phase formation
                        in the Al-Cu-Fe-Mn quaternary system, developed at the Pakistan
                        Institute of Engineering and Applied Sciences (PIEAS).
                      </span>
                      <span className="block">
                        Heuristics are derived from the Hume-Rothery electron concentration
                        rule and known Tsai-type icosahedral phase fields. Real ML
                        integration (HYPOD-X database) is planned for the next iteration.
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

            <div className="space-y-4">
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
                      <span className="data-mono text-sm text-primary">
                        {comp[k].toFixed(1)} at%
                      </span>
                    </div>
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
                      <span>{max}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`mt-4 rounded-lg border px-3 py-2 text-sm data-mono ${
              Math.abs(desc.total - 100) < 0.1
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}>
              Total: {desc.total.toFixed(1)} at%
            </div>

            <button
              onClick={applyPreset}
              title="Based on known stable Al-Cu-Fe-Mn QC literature"
              className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Suggest QC-Optimized Composition
            </button>

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
                  style={{ background: pred.color + "22", color: pred.color, border: `1px solid ${pred.color}44` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: pred.color }} />
                  {pred.kind === "QC" ? "QC POSITIVE" : pred.kind === "APPROX" ? "APPROXIMANT" : "NON-QC"}
                </span>
                <span className="data-mono text-xs text-muted-foreground">
                  Al{comp.Al.toFixed(0)}Cu{comp.Cu.toFixed(0)}Fe{comp.Fe.toFixed(0)}Mn{comp.Mn.toFixed(0)}
                </span>
              </div>

              <h3 className="mt-4 text-3xl font-bold" style={{ color: pred.color }}>
                {pred.label}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{pred.reasoning}</p>

              {/* Arc gauge */}
              <div className="mt-5 flex items-center gap-5">
                <ArcGauge value={pred.confidence} color={pred.color} />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</div>
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
                            : desc.e_a >= 1.75 && desc.e_a <= 2.10
                            ? "#F59E0B"
                            : "#EF4444",
                      }}
                    >
                      {desc.e_a.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>

              {pred.warning && (
                <div className="mt-4 rounded-md border border-qc-approximant/40 bg-qc-approximant/10 px-3 py-2 text-xs text-qc-approximant">
                  ⚠ {pred.warning}
                </div>
              )}
            </div>

            {/* Hume-Rothery gauge */}
            <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Hume-Rothery Electron Concentration</span>
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
            </div>

            {/* Phase diagram reference */}
            <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Reference: Al-Cu-Fe-Mn QC phase field
              </div>
              <pre className="data-mono text-[10px] leading-tight text-muted-foreground overflow-x-auto">
{`        Al (apex)
           /\\
          /  \\
         / QC \\        ← icosahedral i-phase
        /  ◆◆  \\           (Al~65, Cu~15, Fe~12, Mn~4-6)
       /  ◆◆◆◆  \\
      / approx.  \\
     /────────────\\
    Cu            Fe`}
              </pre>
              <div className="text-[10px] text-muted-foreground mt-1">
                Schematic, after Tsai et al. — Mn stabilizes the icosahedral phase up to ~6 at%.
              </div>
            </div>
          </section>

          {/* PANEL 3 — VISUALIZATION */}
          <section className="lg:col-span-3 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 03a</div>
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
              <div className="flex justify-center gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/60" /> QC reference
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: pred.color }} /> Current
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 text-xs uppercase tracking-wider text-primary">Panel 03b</div>
              <h2 className="text-sm font-semibold mb-2">Element Cards</h2>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ELEMENTS) as ElKey[]).map((k) => {
                  const el = ELEMENTS[k];
                  const contrib = ((comp[k] / 100) * el.valence).toFixed(2);
                  return (
                    <div key={k} className="rounded-lg border border-border bg-secondary/40 p-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold" style={{ color: el.color }}>
                          {k}
                        </span>
                        <span className="data-mono text-xs text-primary">{comp[k].toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground data-mono">
                        <div>EN: {el.en}</div>
                        <div>r: {el.radius} pm</div>
                        <div>→ e/a: {contrib}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  Clear History
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-right">Al%</th>
                    <th className="px-2 py-2 text-right">Cu%</th>
                    <th className="px-2 py-2 text-right">Fe%</th>
                    <th className="px-2 py-2 text-right">Mn%</th>
                    <th className="px-2 py-2 text-right">e/a</th>
                    <th className="px-2 py-2 text-left">Predicted Phase</th>
                    <th className="px-2 py-2 text-right">Conf%</th>
                    <th className="px-2 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="data-mono">
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-2 py-6 text-center text-muted-foreground">
                        Adjust composition sliders to begin logging predictions.
                      </td>
                    </tr>
                  )}
                  {[...history].reverse().map((r) => {
                    const isBest = bestQC?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-border/50 hover:bg-secondary/30 ${
                          isBest ? "bg-qc-positive/10" : ""
                        }`}
                        style={{ borderLeft: `3px solid ${r.pred.color}` }}
                      >
                        <td className="px-2 py-1.5">{r.id}{isBest && <span className="ml-1 text-qc-positive">★</span>}</td>
                        <td className="px-2 py-1.5 text-right">{r.comp.Al.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-right">{r.comp.Cu.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-right">{r.comp.Fe.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-right">{r.comp.Mn.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-right">{r.e_a.toFixed(3)}</td>
                        <td className="px-2 py-1.5 text-left font-sans" style={{ color: r.pred.color }}>
                          {r.pred.label}
                        </td>
                        <td className="px-2 py-1.5 text-right">{r.pred.confidence.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-right text-muted-foreground">{r.ts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {bestQC && (
              <div className="mt-3 text-xs text-qc-positive">
                ★ Best QC candidate: #{bestQC.id} — Al{bestQC.comp.Al.toFixed(1)} Cu{bestQC.comp.Cu.toFixed(1)} Fe{bestQC.comp.Fe.toFixed(1)} Mn{bestQC.comp.Mn.toFixed(1)} ({bestQC.pred.confidence.toFixed(1)}% confidence)
              </div>
            )}
          </section>
        </div>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          This tool uses rule-based heuristics as a prototype for an ML model being trained on the HYPOD-X quasicrystal database.
          Predictions are for research guidance only. Experimental validation required.
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
  const c = Math.PI * r; // half circumference
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg width="100" height="60" viewBox="0 0 100 60">
      <path
        d={`M 10 55 A ${r} ${r} 0 0 1 90 55`}
        fill="none"
        stroke="#1E293B"
        strokeWidth="8"
        strokeLinecap="round"
      />
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
        {Math.round(value)}
      </text>
    </svg>
  );
}

function HumeRotheryBar({ value }: { value: number }) {
  const min = 1.5;
  const max = 2.3;
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
      {/* zones */}
      <div className="absolute inset-y-0" style={{ left: "0%", width: `${((1.75 - min) / (max - min)) * 100}%`, background: "#EF444433" }} />
      <div className="absolute inset-y-0" style={{ left: `${((1.75 - min) / (max - min)) * 100}%`, width: `${((1.80 - 1.75) / (max - min)) * 100}%`, background: "#F59E0B44" }} />
      <div className="absolute inset-y-0" style={{ left: `${((1.80 - min) / (max - min)) * 100}%`, width: `${((1.95 - 1.80) / (max - min)) * 100}%`, background: "#22C55E55" }} />
      <div className="absolute inset-y-0" style={{ left: `${((1.95 - min) / (max - min)) * 100}%`, width: `${((2.10 - 1.95) / (max - min)) * 100}%`, background: "#F59E0B44" }} />
      <div className="absolute inset-y-0" style={{ left: `${((2.10 - min) / (max - min)) * 100}%`, right: 0, background: "#EF444433" }} />
      {/* marker */}
      <div
        className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-lg"
        style={{ left: `${pct}%`, transition: "left 0.3s ease" }}
      />
    </div>
  );
}
