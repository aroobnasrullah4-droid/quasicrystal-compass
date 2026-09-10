import { Panel } from "@/components/panel";
import {
  PHASES,
  dominantPhase,
  dopantNote,
  verdictFor,
  type Dist,
  type Entry,
} from "@/lib/phase-core";

export function PhasePrediction({
  dist,
  confidence,
  loading,
  error,
  dopant,
  mlLabel,
}: {
  dist: Dist | null;
  confidence: number | null;
  loading: boolean;
  error: string | null;
  dopant: Entry | null;
  mlLabel: string | null;
}) {
  const dom = dist ? dominantPhase(dist) : null;
  const domMeta = PHASES.find((p) => p.key === dom);
  const verdict = dist && dom ? verdictFor(dom, dist) : null;
  const note = dopant ? dopantNote(dopant.el, dopant.amt) : null;

  return (
    <Panel title="Phase Prediction" subtitle="HYPOD-X ML model" loading={loading}>
      {error && (
        <div className="mb-3 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4">
        <div
          className="text-2xl font-bold tracking-tight"
          style={{ color: domMeta?.color ?? "#64748b" }}
        >
          {domMeta?.label ?? (loading ? "Predicting…" : "Awaiting composition")}
        </div>
        <div className="text-xs text-muted-foreground">
          ML Confidence: {confidence != null ? `${confidence.toFixed(1)}%` : "—"}
          {mlLabel ? ` · model verdict: ${mlLabel}` : ""}
        </div>
      </div>

      <div className="space-y-2">
        {PHASES.map((p) => {
          const v = dist?.[p.key] ?? 0;
          const isDom = p.key === dom;
          return (
            <div key={p.key}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span className={isDom ? "font-semibold text-foreground" : "text-muted-foreground"}>
                  {p.label}
                </span>
                <span className="data-mono" style={{ color: p.color }}>
                  {v.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, v))}%`,
                    background: p.color,
                    boxShadow: isDom ? `0 0 12px ${p.color}` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {verdict && (
        <div className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${verdict.cls}`}>
          {verdict.text}
        </div>
      )}

      {note && dopant && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            note.tone === "good"
              ? "border-green-500/30 bg-green-500/5 text-green-300"
              : note.tone === "warn"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                : "border-border bg-secondary/50 text-muted-foreground"
          }`}
        >
          <span className="font-semibold">
            {dopant.el} {dopant.amt}% —{" "}
          </span>
          {note.text}
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground">
        Phase fractions are resolved from the model's QC probability and Hume-Rothery e/a regime;
        confirm experimentally by XRD.
      </p>
    </Panel>
  );
}
