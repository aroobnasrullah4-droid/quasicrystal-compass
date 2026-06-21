import { useMemo, useState } from "react";

interface Comp { Al: number; Cu: number; Fe: number; Mn: number }

export function CNTGrowthTab({ comp }: { comp: Comp }) {
  const [naoh, setNaoh] = useState(10);
  const [leachT, setLeachT] = useState(24);
  const [leachTemp, setLeachTemp] = useState(60);

  const [synthTemp, setSynthTemp] = useState(750);
  const [flow, setFlow] = useState(80);
  const [actTime, setActTime] = useState(45);
  const [h2c, setH2c] = useState(2);

  const leach = useMemo(() => {
    const alDiss = (comp.Al * naoh * 0.043);
    const siteScore = naoh * (leachT ** 0.5) * (leachTemp / 60);
    const siteLabel =
      siteScore < 30 ? "Low" : siteScore < 80 ? "Medium" : siteScore < 160 ? "High" : "Very High";
    const pore = 8 + naoh * 0.4;
    const cuFeRatio = (comp.Cu / Math.max(0.1, comp.Fe)) * (1 + naoh * 0.05);
    return { alDiss, siteLabel, siteScore, pore, cuFeRatio };
  }, [comp, naoh, leachT, leachTemp]);

  const growth = useMemo(() => {
    let cntType = "MWCNT";
    if (synthTemp < 500) cntType = "No growth";
    else if (synthTemp > 700 && leach.cuFeRatio > 1.5) cntType = "MWCNT";
    else if (synthTemp >= 500 && synthTemp <= 700) cntType = "SWCNT";

    const highYield = synthTemp > 750 && comp.Fe > 10;
    const diameter = 2 + comp.Fe * 0.3 + synthTemp * 0.008;

    const yieldScore = leach.siteScore * (synthTemp / 700) * (flow / 100) * (1 / Math.max(0.5, Math.abs(h2c - 2.5)));
    const yieldLabel =
      cntType === "No growth" ? "None" :
      yieldScore < 30 ? "Low" : yieldScore < 100 ? "Medium" : "High";

    const carbonSrc = h2c > 3 ? "methane-rich feed" : h2c > 1.5 ? "balanced CH₄/H₂" : "C-rich feed";
    const mechanism =
      cntType === "No growth"
        ? `At ${synthTemp}°C the catalyst surface lacks thermal energy to decompose hydrocarbons; no carbon nucleation occurs. Increase temperature above 500°C to initiate growth.`
        : `At ${synthTemp}°C, Fe and Cu nanoparticles formed during NaOH leaching act as catalytic sites. Carbon decomposition from ${carbonSrc} produces ${cntType} with estimated diameter ${diameter.toFixed(1)} nm. The ${leach.cuFeRatio > 1.5 ? "high" : "low"} Cu:Fe ratio (${leach.cuFeRatio.toFixed(2)}) favors ${leach.cuFeRatio > 1.5 ? "tip" : "base"} growth mechanism. ${highYield ? "Fe-rich substrate + high temperature drives high MWCNT yield." : ""}`;

    return { cntType, diameter, yieldLabel, mechanism, highYield };
  }, [synthTemp, flow, h2c, leach, comp.Fe]);

  return (
    <div className="space-y-4">
      {/* Section A — Leaching */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section A</div>
        <h3 className="text-lg font-semibold mb-3">Leaching Pre-treatment Predictor</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <SliderInput label="NaOH concentration" value={naoh} min={1} max={20} step={0.5} unit="M" onChange={setNaoh} />
          <SliderInput label="Leaching time" value={leachT} min={1} max={72} step={1} unit="h" onChange={setLeachT} />
          <SliderInput label="Temperature" value={leachTemp} min={25} max={80} step={1} unit="°C" onChange={setLeachTemp} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OutCard label="Al dissolution rate" value={`${leach.alDiss.toFixed(2)} g/cm²·h`} />
          <OutCard label="Active surface sites" value={leach.siteLabel} accent={leach.siteLabel === "Very High" ? "#22C55E" : leach.siteLabel === "High" ? "#65a30d" : leach.siteLabel === "Medium" ? "#F59E0B" : "#EF4444"} />
          <OutCard label="Expected pore Ø" value={`${leach.pore.toFixed(1)} nm`} />
          <OutCard label="Cu/Fe enrichment" value={leach.cuFeRatio.toFixed(2)} />
        </div>
      </section>

      {/* Section B — CNT growth */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section B</div>
        <h3 className="text-lg font-semibold mb-3">CNT Growth Parameter Predictor</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SliderInput label="Synthesis temperature" value={synthTemp} min={400} max={900} step={10} unit="°C" onChange={setSynthTemp} />
          <SliderInput label="Carbon flow rate" value={flow} min={10} max={200} step={5} unit="sccm" onChange={setFlow} />
          <SliderInput label="Catalyst activation time" value={actTime} min={5} max={120} step={5} unit="min" onChange={setActTime} />
          <SliderInput label="H₂/C ratio" value={h2c} min={0.5} max={5} step={0.1} unit="" onChange={setH2c} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <OutCard label="Predicted CNT type" value={growth.cntType} accent={growth.cntType === "MWCNT" ? "#22C55E" : growth.cntType === "SWCNT" ? "#38BDF8" : "#EF4444"} />
          <OutCard label="Diameter range" value={`${growth.diameter.toFixed(1)} nm`} />
          <OutCard label="Predicted yield" value={growth.yieldLabel} accent={growth.yieldLabel === "High" ? "#22C55E" : growth.yieldLabel === "Medium" ? "#F59E0B" : "#EF4444"} />
        </div>
        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-primary">Growth mechanism</div>
          {growth.mechanism}
        </div>
      </section>

      {/* Section C — Flowchart */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section C</div>
        <h3 className="text-lg font-semibold mb-3">Mechanism Diagram</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Step label="QC Alloy" sub={`Al${comp.Al.toFixed(0)} Cu${comp.Cu.toFixed(0)} Fe${comp.Fe.toFixed(0)} Mn${comp.Mn.toFixed(0)}`} />
          <Arrow label={`${naoh}M NaOH`} />
          <Step label="NaOH Leach" sub={`${leachT}h · ${leachTemp}°C`} />
          <Arrow label="Al → AlO₂⁻" />
          <Step label="Cu/Fe Exposed" sub={`Cu:Fe = ${leach.cuFeRatio.toFixed(2)}`} />
          <Arrow label={`CVD ${synthTemp}°C`} />
          <Step label="Nucleation" sub={`${flow} sccm · H₂/C=${h2c.toFixed(1)}`} />
          <Arrow label={`${actTime} min`} />
          <Step label={growth.cntType} sub={growth.cntType === "No growth" ? "—" : `Ø ${growth.diameter.toFixed(1)} nm`} accent="#22C55E" />
        </div>
      </section>
    </div>
  );
}

function SliderInput({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="data-mono text-xs text-primary">{value}{unit ? ` ${unit}` : ""}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between data-mono text-[9px] text-muted-foreground/70">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function OutCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2" style={accent ? { borderColor: accent + "55", boxShadow: `0 0 14px -6px ${accent}55` } : undefined}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="data-mono text-base font-semibold" style={{ color: accent ?? "#38BDF8" }}>{value}</div>
    </div>
  );
}

function Step({ label, sub, accent }: { label: string; sub?: string; accent?: string }) {
  return (
    <div
      className="rounded-lg border bg-secondary/40 px-3 py-2 min-w-[110px]"
      style={{ borderColor: (accent ?? "#38BDF8") + "55" }}
    >
      <div className="text-xs font-semibold" style={{ color: accent ?? "#38BDF8" }}>{label}</div>
      {sub && <div className="data-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center px-1 text-[10px] text-muted-foreground">
      <span className="data-mono">{label}</span>
      <span className="text-lg text-primary leading-none">→</span>
    </div>
  );
}
