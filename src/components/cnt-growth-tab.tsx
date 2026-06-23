import { useState } from "react";

interface Comp { Al: number; Cu: number; Fe: number; Mn: number }

const API_URL = "https://aroobmunaam-qr-rl-protocol.hf.space/predict";

export function CNTGrowthTab({ comp: _comp }: { comp: Comp }) {
  const [temperature, setTemperature] = useState(750);
  const [pressure, setPressure] = useState(101325);
  const [carbonConc, setCarbonConc] = useState(10);
  const [catalyst, setCatalyst] = useState<"Fe" | "Ni" | "Co">("Fe");
  const [growthTime, setGrowthTime] = useState(45);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature,
          pressure,
          carbon_source_concentration: carbonConc,
          catalyst_type: catalyst,
          growth_time: growthTime,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">CNT Growth</div>
            <h3 className="text-lg font-semibold">RL Protocol Predictor</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Live model · <span className="data-mono">aroobmunaam/qr-rl-protocol</span>
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            ML Connected
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Temperature (°C)">
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="input-base"
              required
            />
          </Field>
          <Field label="Pressure (Pa)">
            <input
              type="number"
              value={pressure}
              onChange={(e) => setPressure(parseFloat(e.target.value))}
              className="input-base"
              required
            />
          </Field>
          <Field label="Carbon source concentration (%)">
            <input
              type="number"
              step="0.1"
              value={carbonConc}
              onChange={(e) => setCarbonConc(parseFloat(e.target.value))}
              className="input-base"
              required
            />
          </Field>
          <Field label="Catalyst type">
            <select
              value={catalyst}
              onChange={(e) => setCatalyst(e.target.value as "Fe" | "Ni" | "Co")}
              className="input-base"
            >
              <option value="Fe">Fe</option>
              <option value="Ni">Ni</option>
              <option value="Co">Co</option>
            </select>
          </Field>
          <Field label="Growth time (minutes)">
            <input
              type="number"
              value={growthTime}
              onChange={(e) => setGrowthTime(parseFloat(e.target.value))}
              className="input-base"
              required
            />
          </Field>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Predicting…" : "Run Prediction"}
            </button>
          </div>
        </form>

        <style>{`
          .input-base {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid hsl(var(--border));
            background: hsl(var(--secondary) / 0.4);
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            color: hsl(var(--foreground));
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .input-base:focus { outline: none; border-color: hsl(var(--primary)); }
        `}</style>
      </section>

      {error && (
        <section className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Error: {error}
        </section>
      )}

      {result && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 text-xs uppercase tracking-wider text-primary">Prediction Result</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(result).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-border bg-secondary/40 px-3 py-2"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="data-mono text-sm font-semibold text-sky-400 break-all">
                  {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                </div>
              </div>
            ))}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Raw response
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg border border-border bg-secondary/30 p-3 text-[11px] data-mono">
{JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
