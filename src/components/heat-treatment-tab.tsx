import { useMemo, useState } from "react";

interface Comp { Al: number; Cu: number; Fe: number; Mn: number }

type Atm = "Air" | "Argon" | "Vacuum" | "N2";
type Cool = "Furnace cool" | "Air cool" | "Water quench" | "Oil quench";

export function HeatTreatmentTab({ comp }: { comp: Comp }) {
  const [temp, setTemp] = useState(750);
  const [time, setTime] = useState(48);
  const [atm, setAtm] = useState<Atm>("Argon");
  const [cool, setCool] = useState<Cool>("Furnace cool");

  const result = useMemo(() => {
    let phase = "";
    let qcFrac = 0;
    if (temp < 500) {
      phase = "β-Al(Cu,Fe) dominant";
      qcFrac = 0;
    } else if (temp < 700) {
      phase = "Partial QC + β";
      qcFrac = ((temp - 500) / 200) * 40;
    } else if (temp <= 884) {
      phase = "Single-phase i-QC";
      qcFrac = 60 + (temp - 700) * 0.17;
    } else {
      phase = "β-Al(Cu,Fe) (peritectic decomp.)";
      qcFrac = 0;
    }

    // Cooling overrides
    if (cool === "Water quench" && temp > 700) {
      phase = "Metastable i-QC (retained by quench)";
      qcFrac = Math.max(qcFrac, 70);
    }
    if (cool === "Furnace cool" && temp > 884) {
      phase = "Equilibrium β phase";
      qcFrac = 0;
    }

    const grain = 2 + time * 0.05 * (temp / 800);

    const hardness =
      qcFrac >= 70 ? 700 + qcFrac * 1.5 :
      qcFrac >= 30 ? 350 + qcFrac * 5 :
      200 + qcFrac * 3;

    return { phase, qcFrac: Math.max(0, Math.min(100, qcFrac)), grain, hardness };
  }, [temp, time, cool]);

  const mechanism = useMemo(() => {
    const stage1 =
      temp < 500 ? "limited diffusion, β phase nucleation"
      : temp < 700 ? "QC nucleation begins on β matrix"
      : temp <= 884 ? "i-QC nuclei form, β consumed"
      : "peritectic decomposition initiates";
    const stage2 =
      temp < 500 ? "β grain growth, no QC formation"
      : temp < 700 ? "partial QC growth, multi-phase coexistence"
      : temp <= 884 ? "single-phase i-QC growth via diffusion"
      : "β-dominant solidification path";
    const coolEffect =
      cool === "Water quench" ? `Water quench freezes the high-T state — ${temp > 700 ? "retains metastable QC" : "no phase change"}.`
      : cool === "Furnace cool" ? `Furnace cooling allows equilibrium phases ${temp > 884 ? "— QC decomposes to β" : "— QC retained if formed"}.`
      : `${cool} provides moderate cooling — partial equilibration.`;

    return `At ${temp}°C for ${time} hours in ${atm}:
1. Initial stage (0–${(time / 4).toFixed(0)}h): ${stage1}.
2. Intermediate (${(time / 4).toFixed(0)}–${(time / 2).toFixed(0)}h): ${stage2}.
3. Final state: ${result.phase} with ~${result.grain.toFixed(1)} μm grains.
4. Cooling effect: ${coolEffect}
Key recommendation: ${
      result.qcFrac >= 60
        ? `optimal QC route — anneal ${temp}°C/${time}h and ${cool === "Water quench" ? "preserve via quench" : "slow-cool to RT"}.`
        : `re-tune: target 750–800°C / 48–72 h in Argon for maximum i-QC yield.`
    }`;
  }, [temp, time, atm, cool, result]);

  return (
    <div className="space-y-4">
      {/* Section A — inputs */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section A</div>
        <h3 className="text-lg font-semibold mb-3">Annealing Parameter Inputs</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Slider label="Annealing temperature" value={temp} min={400} max={1000} step={10} unit="°C" onChange={setTemp} />
          <Slider label="Annealing time" value={time} min={1} max={200} step={1} unit="h" onChange={setTime} />
          <Select label="Atmosphere" value={atm} options={["Air", "Argon", "Vacuum", "N2"]} onChange={(v) => setAtm(v as Atm)} />
          <Select label="Cooling method" value={cool} options={["Furnace cool", "Air cool", "Water quench", "Oil quench"]} onChange={(v) => setCool(v as Cool)} />
        </div>
      </section>

      {/* Section B — Evolution */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section B</div>
        <h3 className="text-lg font-semibold mb-3">Phase Evolution Prediction</h3>
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <Pill label="As-cast" sub={`Al${comp.Al.toFixed(0)} Cu${comp.Cu.toFixed(0)} Fe${comp.Fe.toFixed(0)} Mn${comp.Mn.toFixed(0)}`} />
          <span className="text-primary text-lg">→</span>
          <Pill label={`${temp}°C / ${time}h`} sub={`${atm} · ${cool}`} />
          <span className="text-primary text-lg">→</span>
          <Pill label={result.phase} sub={`QC fraction ~${result.qcFrac.toFixed(0)}%`} accent={result.qcFrac >= 60 ? "#22C55E" : result.qcFrac >= 30 ? "#F59E0B" : "#EF4444"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Final phase" value={result.phase} accent={result.qcFrac >= 60 ? "#22C55E" : "#F59E0B"} />
          <Card label="QC fraction" value={`${result.qcFrac.toFixed(0)}%`} accent={result.qcFrac >= 60 ? "#22C55E" : "#EF4444"} />
          <Card label="Grain size" value={`${result.grain.toFixed(1)} μm`} />
          <Card label="Hardness" value={`${result.hardness.toFixed(0)} HV`} />
        </div>
      </section>

      {/* Section C — Mechanism */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section C</div>
        <h3 className="text-lg font-semibold mb-3">Mechanism Explanation</h3>
        <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
          {mechanism}
        </div>
      </section>

      {/* Section D — Optimum */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section D</div>
        <h3 className="text-lg font-semibold mb-3">Optimum Conditions Finder</h3>
        <button
          onClick={() => { setTemp(775); setTime(60); setAtm("Argon"); setCool("Furnace cool"); }}
          className="rounded-lg border border-qc-positive/40 bg-qc-positive/10 px-4 py-2 text-sm font-semibold text-qc-positive hover:bg-qc-positive/20"
        >
          ✦ Find Best Annealing for QC
        </button>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Optimal temperature" value="750–800 °C" accent="#22C55E" />
          <Card label="Optimal time" value="48–72 h" accent="#22C55E" />
          <Card label="Best atmosphere" value="Argon (no oxidation)" accent="#22C55E" />
          <Card label="Best cooling" value="Furnace → 600°C, then air" accent="#22C55E" />
        </div>
      </section>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="data-mono text-xs text-primary">{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-secondary/40 px-2 py-1.5 text-sm text-foreground">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2"
      style={accent ? { borderColor: accent + "55", boxShadow: `0 0 14px -6px ${accent}55` } : undefined}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold" style={{ color: accent ?? "#38BDF8" }}>{value}</div>
    </div>
  );
}

function Pill({ label, sub, accent }: { label: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg border bg-secondary/40 px-3 py-2 min-w-[140px]"
      style={{ borderColor: (accent ?? "#38BDF8") + "55" }}>
      <div className="text-xs font-semibold" style={{ color: accent ?? "#38BDF8" }}>{label}</div>
      {sub && <div className="data-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
