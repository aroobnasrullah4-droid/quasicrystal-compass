import { useEffect, useMemo, useState } from "react";

type Comp = { Al: number; Cu: number; Fe: number; Mn: number };

interface CNTRow {
  id: number;
  naoh: number;
  time: number;
  leachT: number;
  cvdT: number;
  gas: string;
  flow: number;
  leached: boolean;
  dMin: number;
  dMax: number;
  yieldVal: number;
  diz: number;
  defect: string;
  ts: string;
}

const GASES = [
  { v: "Acetylene", note: "Most common, MWCNT favored" },
  { v: "Methane", note: "Higher temp needed, SWCNT possible" },
  { v: "Ethylene", note: "Moderate, good yield" },
  { v: "CO/CO₂", note: "Lower yield, cleaner CNTs" },
];

interface Params {
  naoh: number;
  time: number;
  leachT: number;
  cvdT: number;
  gas: string;
  flow: number;
  leached: boolean;
}

const DEFAULTS: Params = {
  naoh: 10,
  time: 4,
  leachT: 60,
  cvdT: 700,
  gas: "Acetylene",
  flow: 200,
  leached: true,
};

function computeCNT(p: Params, cuPct: number) {
  const baseMin = p.leached ? 29 : 17;
  const baseMax = p.leached ? 118 : 45;
  const tempFactor = Math.max(0, Math.min(1, (p.cvdT - 600) / 300));
  const diameterShift = tempFactor * 20;
  const naohFactor = (p.naoh - 5) / 10;
  const diameterReduction = naohFactor * 8;
  const dMin = Math.max(2, baseMin + diameterShift - diameterReduction);
  const dMax = Math.max(dMin + 1, baseMax + diameterShift - diameterReduction);

  const naohYield = p.naoh >= 8 && p.naoh <= 12 ? 1.2 : 0.8;
  const tempYield = p.cvdT >= 650 && p.cvdT <= 750 ? 1.3 : 0.9;
  const baseYield = cuPct * 0.8;
  const yieldVal = baseYield * naohYield * tempYield;

  let cntType: string;
  let walls: string;
  if (dMin < 20 && dMax < 60) {
    cntType = "Predominantly MWCNT (few-walled)";
    walls = "3–8 walls";
  } else {
    cntType = "MWCNT (many-walled)";
    walls = "8–20+ walls";
  }

  let defect: string, defectColor: "red" | "amber" | "green";
  if (p.cvdT > 750) {
    defect = "High — catalyst deactivation likely above 750°C";
    defectColor = "red";
  } else if (p.cvdT > 700) {
    defect = "Moderate";
    defectColor = "amber";
  } else {
    defect = "Low — good crystallinity expected";
    defectColor = "green";
  }

  const dband = defectColor === "red" ? "Strong" : defectColor === "amber" ? "Moderate" : "Weak";
  const dgRatio = defectColor === "red" ? 1.2 : defectColor === "amber" ? 0.7 : 0.35;

  const cuSurface = cuPct * (p.naoh / 10) * 1.8;
  const cntCoverage = yieldVal / 50;
  const dizBase = 12;
  const dizEnhancement = cuSurface * 0.15 + cntCoverage * 3.0;
  const diz = dizBase + dizEnhancement;
  const synergy = diz > 16 ? "High" : diz > 13 ? "Moderate" : "Low";

  return {
    dMin,
    dMax,
    yieldVal,
    cntType,
    walls,
    defect,
    defectColor,
    dband,
    dgRatio,
    cuSurface,
    diz,
    synergy,
  };
}

const phaseColor = (c: "red" | "amber" | "green") =>
  c === "green" ? "#22c55e" : c === "amber" ? "#f59e0b" : "#ef4444";

interface SliderRowProps {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  marker?: { at: number; label: string };
  colorFn?: (v: number) => string;
}
function SliderRow({ label, unit, min, max, step, value, onChange, hint, marker, colorFn }: SliderRowProps) {
  const color = colorFn ? colorFn(value) : "#38bdf8";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(+e.target.value)}
            className="w-20 rounded border border-border bg-background px-2 py-0.5 text-right font-mono text-xs"
            style={{ color }}
          />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="w-full accent-sky-400"
        />
        {marker && (
          <div
            className="pointer-events-none absolute -bottom-4 text-[10px] text-amber-400"
            style={{ left: `${((marker.at - min) / (max - min)) * 100}%`, transform: "translateX(-50%)" }}
          >
            {marker.label}
          </div>
        )}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground pt-3">{hint}</div>}
    </div>
  );
}

export function CNTPredictor({ comp }: { comp: Comp }) {
  const [p, setP] = useState<Params>(DEFAULTS);
  const [log, setLog] = useState<CNTRow[]>([]);
  const [open, setOpen] = useState(true);

  const set = <K extends keyof Params>(k: K, v: Params[K]) => setP((s) => ({ ...s, [k]: v }));

  const cuPct = comp?.Cu ?? 20;
  const r = useMemo(() => computeCNT(p, cuPct), [p, cuPct]);

  // log on debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setLog((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.naoh === p.naoh &&
          last.time === p.time &&
          last.cvdT === p.cvdT &&
          last.leached === p.leached &&
          Math.abs(last.dMin - r.dMin) < 0.5
        )
          return prev;
        const row: CNTRow = {
          id: (prev[prev.length - 1]?.id ?? 0) + 1,
          naoh: p.naoh,
          time: p.time,
          leachT: p.leachT,
          cvdT: p.cvdT,
          gas: p.gas,
          flow: p.flow,
          leached: p.leached,
          dMin: r.dMin,
          dMax: r.dMax,
          yieldVal: r.yieldVal,
          diz: r.diz,
          defect: r.defect.split(" —")[0],
          ts: new Date().toLocaleTimeString(),
        };
        return [...prev, row].slice(-30);
      });
    }, 700);
    return () => clearTimeout(t);
  }, [p, r]);

  const bestDiz = log.length ? log.reduce((a, b) => (b.diz > a.diz ? b : a)) : null;

  const optimize = (goal: "diameter" | "yield" | "diz") => {
    if (goal === "diameter")
      setP({ ...DEFAULTS, naoh: 12, time: 6, cvdT: 650, flow: 300, leached: true });
    else if (goal === "yield")
      setP({ ...DEFAULTS, naoh: 10, time: 4, cvdT: 700, flow: 200, leached: true });
    else setP({ ...DEFAULTS, naoh: 10, time: 4, cvdT: 700, flow: 200, leached: true });
  };

  const exportCSV = () => {
    const header =
      "#,NaOH(M),Time(hr),LeachT(C),CVD(C),Gas,Flow(sccm),Catalyst,dMin(nm),dMax(nm),Yield(mg/g),DIZ(mm),Defect,Time";
    const rows = log.map(
      (l) =>
        `${l.id},${l.naoh},${l.time},${l.leachT},${l.cvdT},${l.gas},${l.flow},${l.leached ? "Leached" : "Un-leached"},${l.dMin.toFixed(1)},${l.dMax.toFixed(1)},${l.yieldVal.toFixed(1)},${l.diz.toFixed(2)},${l.defect},${l.ts}`,
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cnt_experiments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyColab = () => {
    const arr = log.map((l) => ({
      NaOH: l.naoh,
      leach_time: l.time,
      CVD_temp: l.cvdT,
      diameter_min: +l.dMin.toFixed(1),
      diameter_max: +l.dMax.toFixed(1),
      yield_mg_g: +l.yieldVal.toFixed(2),
      DIZ: +l.diz.toFixed(2),
      catalyst: l.leached ? "leached" : "un-leached",
    }));
    const py = `cnt_data = ${JSON.stringify(arr, null, 2)}\n\nimport pandas as pd\ndf = pd.DataFrame(cnt_data)\nprint(df.head())`;
    void navigator.clipboard.writeText(py);
  };

  const naohColor = (v: number) => (v >= 8 && v <= 12 ? "#22c55e" : "#f59e0b");
  const cvdZone =
    p.cvdT < 600
      ? "Low — limited decomposition"
      : p.cvdT <= 750
        ? "Optimal for MWCNT ✓"
        : "High — catalyst deactivation risk";
  const cvdColor = p.cvdT < 600 || p.cvdT > 750 ? "#f59e0b" : "#22c55e";

  // SVG visualization values
  const dotCount = p.leached ? Math.round(6 + p.naoh / 2) : 3;
  const dotR = p.leached ? Math.max(2, p.naoh / 3) : 2;
  const tubeThickness = Math.max(1, Math.min(8, (r.dMin + r.dMax) / 30));
  const compTotal = (comp?.Al ?? 0) + (comp?.Cu ?? 0) + (comp?.Fe ?? 0) + (comp?.Mn ?? 0);
  const hasComp = compTotal > 0;

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">🧬 CNT Growth Predictor</h2>
          <p className="text-xs text-muted-foreground">
            Predict carbon nanotube properties from leaching + CVD parameters — Based on Ali et al. (2025)
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Composition connection badge */}
          <div
            className={`rounded-md border px-3 py-2 text-xs ${hasComp ? "border-sky-500/30 bg-sky-500/5" : "border-amber-500/40 bg-amber-500/5"}`}
          >
            {hasComp ? (
              <div className="space-y-1">
                <div>
                  🔗 Using composition:{" "}
                  <span className="font-mono text-sky-300">
                    Al{comp.Al.toFixed(0)} Cu{comp.Cu.toFixed(0)} Fe{comp.Fe.toFixed(0)} Mn{comp.Mn.toFixed(0)}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Cu content: <span className="font-mono text-orange-400">{comp.Cu.toFixed(1)}%</span> → active site
                  density:{" "}
                  <span className="font-semibold" style={{ color: cuPct > 17 ? "#22c55e" : cuPct > 12 ? "#f59e0b" : "#ef4444" }}>
                    {cuPct > 17 ? "HIGH" : cuPct > 12 ? "MODERATE" : "LOW"}
                  </span>{" "}
                  → DIZ bonus: +{(r.cuSurface * 0.15).toFixed(2)} mm
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, cuPct * 4)}%` }} />
                </div>
              </div>
            ) : (
              <span>⚠ Set composition in Composition Panel for Cu-dependent predictions</span>
            )}
          </div>

          {/* SECTION A — Inputs */}
          <div className="rounded-md border border-border bg-background/40 p-3">
            <h3 className="mb-3 text-sm font-semibold text-foreground">CVD & Leaching Parameters</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <SliderRow
                label="NaOH Concentration"
                unit="M"
                min={1}
                max={15}
                step={0.5}
                value={p.naoh}
                onChange={(v) => set("naoh", v)}
                marker={{ at: 10, label: "(Ali et al., 2025)" }}
                colorFn={naohColor}
              />
              <SliderRow
                label="Leaching Time"
                unit="hr"
                min={0.5}
                max={12}
                step={0.5}
                value={p.time}
                onChange={(v) => set("time", v)}
              />
              <SliderRow
                label="Leaching Temperature"
                unit="°C"
                min={20}
                max={80}
                step={1}
                value={p.leachT}
                onChange={(v) => set("leachT", v)}
                hint="Room temp to mild heating"
              />
              <SliderRow
                label="CVD Temperature"
                unit="°C"
                min={500}
                max={900}
                step={10}
                value={p.cvdT}
                onChange={(v) => set("cvdT", v)}
                hint={cvdZone}
                colorFn={() => cvdColor}
              />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Hydrocarbon Gas</label>
                <select
                  value={p.gas}
                  onChange={(e) => set("gas", e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                >
                  {GASES.map((g) => (
                    <option key={g.v} value={g.v}>
                      {g.v}
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-muted-foreground">
                  {GASES.find((g) => g.v === p.gas)?.note}
                </div>
              </div>
              <SliderRow
                label="Carrier Gas Flow Rate"
                unit="sccm"
                min={50}
                max={500}
                step={10}
                value={p.flow}
                onChange={(v) => set("flow", v)}
              />
            </div>

            <div className="mt-4 rounded border border-border p-2">
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Catalyst State:</span>
                <div className="inline-flex rounded border border-border overflow-hidden">
                  <button
                    onClick={() => set("leached", true)}
                    className={`px-3 py-1 text-xs ${p.leached ? "bg-sky-500/20 text-sky-300" : "text-muted-foreground"}`}
                  >
                    Leached QC
                  </button>
                  <button
                    onClick={() => set("leached", false)}
                    className={`px-3 py-1 text-xs ${!p.leached ? "bg-sky-500/20 text-sky-300" : "text-muted-foreground"}`}
                  >
                    Un-leached QC
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {p.leached
                  ? "Al dissolved → Cu/Cu₂O dodecahedral active sites exposed"
                  : "Native QC surface — lower catalytic activity"}
              </div>
            </div>
          </div>

          {/* SECTION C — Result Cards */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* Card 1 Diameter */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">CNT Diameter</div>
              <div className="font-mono text-2xl text-sky-300">
                Predicted: {r.dMin.toFixed(0)} – {r.dMax.toFixed(0)} nm
              </div>
              <div className="text-xs text-muted-foreground">
                Type: {r.cntType} | Walls: {r.walls}
              </div>
              <div className="relative mt-3 h-3 w-full rounded bg-muted">
                <div
                  className="absolute h-full rounded bg-green-500/30"
                  style={{ left: `${(17 / 200) * 100}%`, width: `${((45 - 17) / 200) * 100}%` }}
                  title="Un-leached ref 17–45nm"
                />
                <div
                  className="absolute h-full rounded bg-sky-500/30"
                  style={{ left: `${(29 / 200) * 100}%`, width: `${((118 - 29) / 200) * 100}%` }}
                  title="Leached ref 29–118nm"
                />
                <div
                  className="absolute h-full rounded border border-sky-300 bg-sky-400/70"
                  style={{
                    left: `${(Math.min(r.dMin, 200) / 200) * 100}%`,
                    width: `${Math.max(2, ((Math.min(r.dMax, 200) - Math.min(r.dMin, 200)) / 200) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>0</span>
                <span>100</span>
                <span>200 nm</span>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">Reference: Ali et al. 2025</div>
            </div>

            {/* Card 2 Yield */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">CNT Yield</div>
              <div className="font-mono text-2xl text-sky-300">~{r.yieldVal.toFixed(1)} mg/g</div>
              <div className="text-xs text-muted-foreground">Estimated yield per gram of QC</div>
              <div className="mt-3 h-2 w-full rounded bg-muted">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.min(100, (r.yieldVal / 40) * 100)}%`,
                    background:
                      r.yieldVal > 30
                        ? "#22c55e"
                        : r.yieldVal > 15
                          ? "#84cc16"
                          : r.yieldVal > 5
                            ? "#f59e0b"
                            : "#ef4444",
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Poor &lt;5</span>
                <span>Mod 5–15</span>
                <span>Good 15–30</span>
                <span>Excellent &gt;30</span>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Actual yield depends on reactor geometry and gas purity.
              </div>
            </div>

            {/* Card 3 Quality */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">Quality Assessment</div>
              <div className="mt-1">
                <span
                  className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                  style={{ background: `${phaseColor(r.defectColor)}22`, color: phaseColor(r.defectColor) }}
                >
                  Defect Level: {r.defectColor === "green" ? "Low" : r.defectColor === "amber" ? "Moderate" : "High"}
                </span>
              </div>
              <div className="mt-2 rounded border border-border bg-background/40 p-2 font-mono text-[11px] text-muted-foreground space-y-0.5">
                <div>Expected Raman peaks:</div>
                <div>
                  D band (~1350 cm⁻¹): <span className="text-foreground">{r.dband}</span> — defect density
                </div>
                <div>
                  G band (~1580 cm⁻¹): <span className="text-foreground">Strong</span> — graphitic carbon
                </div>
                <div>
                  D/G ratio estimate: <span className="text-sky-300">{r.dgRatio.toFixed(2)}</span>
                </div>
                <div>2D band (~2700 cm⁻¹): present in few-walled CNTs</div>
              </div>
            </div>

            {/* Card 4 DIZ */}
            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">Antibacterial DIZ</div>
              <div
                className="font-mono text-2xl"
                style={{ color: r.diz > 15 ? "#22c55e" : r.diz > 12 ? "#f59e0b" : "#ef4444" }}
              >
                ~{r.diz.toFixed(1)} mm DIZ
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded bg-muted">
                    <div className="h-full rounded bg-slate-400" style={{ width: "53%" }} />
                  </div>
                  <span>Un-leached QC ref: ~8 mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded bg-muted">
                    <div className="h-full rounded bg-emerald-500" style={{ width: "100%" }} />
                  </div>
                  <span>Leached QC+CNT (Ali 2025): ~15 mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded bg-muted">
                    <div
                      className="h-full rounded bg-sky-400"
                      style={{ width: `${Math.min(100, (r.diz / 20) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sky-300">Your prediction: {r.diz.toFixed(1)} mm</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">Cu/Cu₂O ROS ✓</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">CNT piercing ✓</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">Cu ion release ✓</span>
                <span
                  className="rounded px-2 py-0.5"
                  style={{
                    background: `${phaseColor(r.synergy === "High" ? "green" : r.synergy === "Moderate" ? "amber" : "red")}22`,
                    color: phaseColor(r.synergy === "High" ? "green" : r.synergy === "Moderate" ? "amber" : "red"),
                  }}
                >
                  Synergy: {r.synergy}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION D — Visualization */}
          <div className="rounded-md border border-border bg-background/40 p-3">
            <h3 className="mb-2 text-sm font-semibold text-foreground">CNT Growth Schematic</h3>
            <div className="grid gap-3 md:grid-cols-2 items-center">
              <svg viewBox="0 0 300 180" className="w-full">
                <polygon
                  points="80,40 160,40 200,90 160,140 80,140 40,90"
                  fill="#1f2937"
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <text x="120" y="95" fill="#64748b" fontSize="9" textAnchor="middle">
                  QC Particle
                </text>
                {/* Cu dots */}
                {Array.from({ length: dotCount }).map((_, i) => {
                  const angle = (i / dotCount) * Math.PI * 2;
                  const cx = 120 + Math.cos(angle) * 55;
                  const cy = 90 + Math.sin(angle) * 40;
                  return (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r={dotR} fill="#f97316" />
                      {p.leached && (
                        <line
                          x1={cx}
                          y1={cy}
                          x2={cx + Math.cos(angle) * 40}
                          y2={cy + Math.sin(angle) * 40}
                          stroke="#0f172a"
                          strokeWidth={tubeThickness}
                        />
                      )}
                    </g>
                  );
                })}
                <text x="150" y="170" fill="#64748b" fontSize="8" textAnchor="middle">
                  Schematic only — not to scale
                </text>
              </svg>
              <div className="rounded border border-border bg-background/40 p-2 text-[11px] text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground">Growth Mechanism</div>
                <div>1. NaOH leaches Al from QC surface</div>
                <div>2. Cu/Cu₂O dodecahedral active sites are exposed</div>
                <div>
                  3. {p.gas} decomposes at <span className="text-sky-300">{p.cvdT}°C</span> on Cu sites
                </div>
                <div>4. Carbon atoms diffuse and precipitate as CNT walls</div>
                <div>5. MWCNTs grow from catalyst surface (tip or base growth)</div>
                <div className="pt-1 text-sky-300">
                  Result: {r.dMin.toFixed(0)}–{r.dMax.toFixed(0)} nm diameter MWCNTs
                </div>
              </div>
            </div>
          </div>

          {/* SECTION E — Optimize */}
          <div className="rounded-md border border-border bg-background/40 p-3">
            <h3 className="mb-2 text-sm font-semibold text-foreground">🎯 Optimize for My Goal</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => optimize("diameter")}
                className="rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20"
                title="High NaOH maximizes Al dissolution → smaller Cu catalyst particles → thinner CNTs"
              >
                Smallest Diameter CNTs
              </button>
              <button
                onClick={() => optimize("yield")}
                className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20"
                title="Optimal conditions matching Ali et al. 2025 published parameters"
              >
                Maximum Yield
              </button>
              <button
                onClick={() => optimize("diz")}
                className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20"
                title="Maximizes Cu/Cu₂O active site density while maintaining CNT coverage"
              >
                Best Antibacterial DIZ
              </button>
            </div>
          </div>

          {/* SECTION G — History & Export */}
          <div className="rounded-md border border-border bg-background/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                🧪 CNT Experiment Log ({log.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={exportCSV}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  Export CSV
                </button>
                <button
                  onClick={copyColab}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                >
                  Copy to Colab
                </button>
                <button
                  onClick={() => setLog([])}
                  className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: 240 }}>
              <table className="w-full text-[11px] font-mono">
                <thead className="sticky top-0 bg-card text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-right">NaOH</th>
                    <th className="px-2 py-1 text-right">hr</th>
                    <th className="px-2 py-1 text-right">CVD°C</th>
                    <th className="px-2 py-1 text-left">Cat</th>
                    <th className="px-2 py-1 text-right">d(nm)</th>
                    <th className="px-2 py-1 text-right">Yield</th>
                    <th className="px-2 py-1 text-right">DIZ</th>
                    <th className="px-2 py-1 text-left">Defect</th>
                    <th className="px-2 py-1 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {log.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-2 py-4 text-center text-muted-foreground">
                        Adjust parameters to start logging predictions.
                      </td>
                    </tr>
                  )}
                  {log.map((l) => (
                    <tr key={l.id} className="border-b border-border/40">
                      <td className="px-2 py-1">
                        {bestDiz?.id === l.id && <span className="text-amber-400">★</span>} {l.id}
                      </td>
                      <td className="px-2 py-1 text-right">{l.naoh}</td>
                      <td className="px-2 py-1 text-right">{l.time}</td>
                      <td className="px-2 py-1 text-right">{l.cvdT}</td>
                      <td className="px-2 py-1">{l.leached ? "L" : "U"}</td>
                      <td className="px-2 py-1 text-right">
                        {l.dMin.toFixed(0)}–{l.dMax.toFixed(0)}
                      </td>
                      <td className="px-2 py-1 text-right">{l.yieldVal.toFixed(1)}</td>
                      <td className="px-2 py-1 text-right">{l.diz.toFixed(1)}</td>
                      <td className="px-2 py-1">{l.defect}</td>
                      <td className="px-2 py-1">{l.ts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION H — Reference Card */}
          <div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-[11px] text-muted-foreground">
            <div className="mb-1 font-semibold text-foreground">
              📋 Experimental Reference (Ali et al. 2025 — SSRN 5887591)
            </div>
            <div>Leaching: 10M NaOH | QC System: AlCuFeMn</div>
            <div className="mt-1">
              <span className="text-foreground">Un-leached QC + CNT:</span> Diameter 17–45 nm
            </div>
            <div>
              <span className="text-foreground">Leached QC + CNT:</span> Diameter 29–118 nm; DIZ higher than all
              previously reported QC alloys
            </div>
            <div className="mt-1">
              Mechanism: Synergistic effect of Cu/Cu₂O active sites + CNT deposition in leached QC alloy.
            </div>
            <div className="mt-1">Characterization used: XRD, SEM, EDX, Raman, DIZ test</div>
          </div>
        </div>
      )}
    </section>
  );
}
