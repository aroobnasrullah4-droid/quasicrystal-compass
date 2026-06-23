import { useState } from "react";

interface Comp { Al: number; Cu: number; Fe: number; Mn: number }

const TRAIN_URL = "https://aroobmunaam-qr-rl-protocol.hf.space/train";
const PROTOCOL_URL = "https://aroobmunaam-qr-rl-protocol.hf.space/protocol";

type Stage = "idle" | "training" | "protocol" | "done";

export function CNTGrowthTab({ comp }: { comp: Comp }) {
  const [al, setAl] = useState(comp.Al ?? 65);
  const [cu, setCu] = useState(comp.Cu ?? 20);
  const [fe, setFe] = useState(comp.Fe ?? 10);
  const [mn, setMn] = useState(comp.Mn ?? 5);
  const [eA, setEA] = useState(1.86);
  const [t0, setT0] = useState(800);
  const [nEpochs, setNEpochs] = useState(80);
  const [nStepsTrain, setNStepsTrain] = useState(180);
  const [nStepsProto, setNStepsProto] = useState(300);

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [trainResult, setTrainResult] = useState<Record<string, unknown> | null>(null);
  const [protocolResult, setProtocolResult] = useState<Record<string, unknown> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTrainResult(null);
    setProtocolResult(null);

    const composition = { Al: al, Cu: cu, Fe: fe, Mn: mn };

    try {
      setStage("training");
      const trainRes = await fetch(TRAIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composition, e_a: eA, n_epochs: nEpochs, n_steps: nStepsTrain }),
      });
      if (!trainRes.ok) throw new Error(`Train failed: ${trainRes.status}`);
      const trainData = await trainRes.json();
      setTrainResult(trainData);

      const policy = (trainData as { policy?: unknown }).policy;
      if (!policy) throw new Error("Train response missing 'policy' field");

      setStage("protocol");
      const protoRes = await fetch(PROTOCOL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composition, e_a: eA, T0_phys: t0, policy, n_steps: nStepsProto }),
      });
      if (!protoRes.ok) throw new Error(`Protocol failed: ${protoRes.status}`);
      const protoData = await protoRes.json();
      setProtocolResult(protoData);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("idle");
    }
  }

  const loading = stage === "training" || stage === "protocol";

  const trajectory = protocolResult
    ? ((protocolResult.trajectory ?? protocolResult.T_trajectory ?? protocolResult.temperatures) as unknown[] | undefined)
    : undefined;
  const recommendation = protocolResult
    ? (protocolResult.recommendation ?? protocolResult.summary ?? protocolResult.best ?? null)
    : null;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">CNT Growth Protocol (RL)</h2>
          <p className="text-xs text-muted-foreground">2-step API: train policy → generate protocol</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          ML Connected
        </span>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Al %" value={al} onChange={setAl} />
        <Field label="Cu %" value={cu} onChange={setCu} />
        <Field label="Fe %" value={fe} onChange={setFe} />
        <Field label="Mn %" value={mn} onChange={setMn} />
        <Field label="e/a" value={eA} onChange={setEA} step={0.01} />
        <Field label="T₀ (°C)" value={t0} onChange={setT0} />
        <Field label="n_epochs" value={nEpochs} onChange={setNEpochs} />
        <Field label="n_steps (train)" value={nStepsTrain} onChange={setNStepsTrain} />
        <Field label="n_steps (protocol)" value={nStepsProto} onChange={setNStepsProto} />
        <div className="col-span-2 flex items-end md:col-span-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {stage === "training" && "Step 1/2 · Training policy…"}
            {stage === "protocol" && "Step 2/2 · Generating protocol…"}
            {!loading && "Run RL Protocol"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>
            {stage === "training" ? "Training RL policy on composition…" : "Rolling out optimal protocol…"}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {recommendation != null && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <h3 className="mb-2 text-sm font-semibold">Recommendation</h3>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {typeof recommendation === "string" ? recommendation : JSON.stringify(recommendation, null, 2)}
          </pre>
        </div>
      )}

      {trajectory && Array.isArray(trajectory) && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <h3 className="mb-2 text-sm font-semibold">Trajectory ({trajectory.length} steps)</h3>
          <Trajectory data={trajectory as number[]} />
        </div>
      )}

      {protocolResult && (
        <details className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Raw protocol response</summary>
          <pre className="mt-2 overflow-x-auto text-[11px] text-muted-foreground">
            {JSON.stringify(protocolResult, null, 2)}
          </pre>
        </details>
      )}

      {trainResult && (
        <details className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <summary className="cursor-pointer font-medium">Raw train response</summary>
          <pre className="mt-2 overflow-x-auto text-[11px] text-muted-foreground">
            {JSON.stringify(trainResult, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
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

function Trajectory({ data }: { data: number[] }) {
  const nums = data.filter((v) => typeof v === "number");
  if (!nums.length) return <p className="text-xs text-muted-foreground">No numeric trajectory.</p>;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const w = 600;
  const h = 100;
  const pts = nums
    .map((v, i) => `${(i / (nums.length - 1 || 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke="currentColor" className="text-primary" strokeWidth={1.5} />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>min {min.toFixed(2)}</span>
        <span>max {max.toFixed(2)}</span>
        <span>final {nums[nums.length - 1].toFixed(2)}</span>
      </div>
    </div>
  );
}
