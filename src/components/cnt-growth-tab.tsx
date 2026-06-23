import { useEffect, useState } from "react";

interface Comp { Al: number; Cu: number; Fe: number; Mn: number }

const TRAIN_URL = "https://aroobmunaam-qr-rl-protocol.hf.space/train";
const PROTOCOL_URL = "https://aroobmunaam-qr-rl-protocol.hf.space/protocol";

type Stage = "idle" | "training" | "protocol" | "done";
type Json = Record<string, unknown>;

function pick(obj: Json | null, ...keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  // try nested common containers
  for (const c of ["annealing", "cvd", "verification", "results", "summary", "recommendation"]) {
    const inner = obj[c];
    if (inner && typeof inner === "object") {
      const found = pick(inner as Json, ...keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function fmt(v: unknown, suffix = ""): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "number") return `${Number.isInteger(v) ? v : v.toFixed(2)}${suffix ? ` ${suffix}` : ""}`;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return `${String(v)}${suffix ? ` ${suffix}` : ""}`;
}

export function CNTGrowthTab({ comp }: { comp: Comp }) {
  const [al, setAl] = useState(comp.Al ?? 65);
  const [cu, setCu] = useState(comp.Cu ?? 20);
  const [fe, setFe] = useState(comp.Fe ?? 10);
  const [mn, setMn] = useState(comp.Mn ?? 5);
  const [eA, setEA] = useState(1.86);
  const [t0, setT0] = useState(800);

  // auto-fill from Tab 1 when composition changes
  useEffect(() => { setAl(comp.Al); setCu(comp.Cu); setFe(comp.Fe); setMn(comp.Mn); }, [comp.Al, comp.Cu, comp.Fe, comp.Mn]);

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [protocolResult, setProtocolResult] = useState<Json | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProtocolResult(null);
    const composition = { Al: al, Cu: cu, Fe: fe, Mn: mn };

    try {
      setStage("training");
      const trainRes = await fetch(TRAIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composition, e_a: eA, n_epochs: 80, n_steps: 180 }),
      });
      if (!trainRes.ok) throw new Error(`Train failed: ${trainRes.status}`);
      const trainData = (await trainRes.json()) as Json;
      const policy = trainData.policy;
      if (!policy) throw new Error("Train response missing 'policy'");

      setStage("protocol");
      const protoRes = await fetch(PROTOCOL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composition, e_a: eA, T0_phys: t0, policy, n_steps: 300 }),
      });
      if (!protoRes.ok) throw new Error(`Protocol failed: ${protoRes.status}`);
      const protoData = (await protoRes.json()) as Json;
      setProtocolResult(protoData);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("idle");
    }
  }

  const loading = stage === "training" || stage === "protocol";
  const r = protocolResult;

  // Section data extraction (best-effort across response shapes)
  const annealing = {
    "Anneal Temperature": fmt(pick(r, "anneal_T", "anneal_temperature", "T_anneal"), "°C"),
    "Hold Time": fmt(pick(r, "hold_time", "anneal_hold", "t_hold"), "h"),
    "Cool Rate": fmt(pick(r, "cool_rate", "cooling_rate"), "°C/min"),
    "Milling Hours": fmt(pick(r, "milling_hours", "milling_time", "t_mill"), "h"),
    "RPM": fmt(pick(r, "rpm", "mill_rpm")),
    "BPR": fmt(pick(r, "bpr", "ball_powder_ratio")),
  };
  const cvd = {
    "CVD Temperature": fmt(pick(r, "cvd_T", "cvd_temperature", "T_cvd"), "°C"),
    "Gas Mixture": fmt(pick(r, "gas_mixture", "gas", "gases")),
    "Flow Rate": fmt(pick(r, "flow_rate", "gas_flow"), "sccm"),
    "Time": fmt(pick(r, "cvd_time", "growth_time", "t_cvd"), "min"),
  };
  const verif = {
    "Final σ": fmt(pick(r, "sigma_final", "final_sigma", "sigma")),
    "σ*": fmt(pick(r, "sigma_star", "sigma_target")),
    "QC Achieved": fmt(pick(r, "qc_achieved", "is_qc", "qc")),
    "XRD Peaks": fmt(pick(r, "xrd_peaks", "peaks", "xrd")),
    "Hardness": fmt(pick(r, "hardness", "hardness_estimate", "HV"), "HV"),
    "Density": fmt(pick(r, "density", "density_estimate"), "g/cm³"),
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">CNT Growth — RL Synthesis Protocol</h2>
          <p className="text-xs text-muted-foreground">2-step RL: train policy → generate full synthesis protocol</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          ML Connected
        </span>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Field label="Al %" value={al} onChange={setAl} />
        <Field label="Cu %" value={cu} onChange={setCu} />
        <Field label="Fe %" value={fe} onChange={setFe} />
        <Field label="Mn %" value={mn} onChange={setMn} />
        <Field label="e/a" value={eA} onChange={setEA} step={0.01} />
        <Field label="T₀ (°C)" value={t0} onChange={setT0} />
        <div className="col-span-2 md:col-span-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run Protocol"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>{stage === "training" ? "Training RL model…" : "Generating protocol…"}</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {r && (
        <div className="grid gap-3 md:grid-cols-3">
          <Section title="1 · Annealing Parameters" data={annealing} />
          <Section title="2 · CNT Growth (CVD)" data={cvd} />
          <Section title="3 · QC Verification" data={verif} />
        </div>
      )}

      {r && (
        <details className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Raw protocol response</summary>
          <pre className="mt-2 overflow-x-auto text-[11px] text-muted-foreground">
            {JSON.stringify(r, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function Section({ title, data }: { title: string; data: Record<string, string> }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <dl className="space-y-1.5 text-xs">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Field({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
    </label>
  );
}
