import { Panel } from "@/components/panel";
import { EA_TABLE, eaExpectedPhase, type Entry } from "@/lib/phase-core";

const MIN = 1.6;
const MAX = 2.0;
const pct = (v: number) => ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * 100;

export function EAAnalysis({
  ea,
  baseEa,
  dopant,
  loading,
}: {
  ea: number;
  baseEa: number;
  dopant: Entry | null;
  loading: boolean;
}) {
  const inWindow = ea >= 1.75 && ea <= 1.86;

  return (
    <Panel title="Hume-Rothery e/a Analysis" loading={loading}>
      <div className="text-center">
        <div
          className={`data-mono text-3xl font-bold ${inWindow ? "text-green-400" : "text-red-400"}`}
        >
          e/a = {ea.toFixed(3)}
        </div>
      </div>

      <div className="mt-5">
        <div className="relative h-4 w-full overflow-hidden rounded-full bg-red-500/25">
          <div
            className="absolute inset-y-0 bg-green-500/60"
            style={{ left: `${pct(1.75)}%`, width: `${pct(1.86) - pct(1.75)}%` }}
          />
          <div
            className="absolute inset-y-[-4px] w-0.5 bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.7)]"
            style={{ left: `${pct(ea)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground data-mono">
          <span>1.60</span>
          <span>1.70</span>
          <span className="text-green-400">1.75</span>
          <span className="text-green-400">1.86</span>
          <span>1.90</span>
          <span>2.00</span>
        </div>
      </div>

      <div
        className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${
          inWindow
            ? "border-green-500/40 bg-green-500/10 text-green-300"
            : "border-red-500/40 bg-red-500/10 text-red-300"
        }`}
      >
        {inWindow
          ? "✓ In QC stability window"
          : `✗ Outside window — ${eaExpectedPhase(ea)} likely`}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">e/a Range</th>
              <th className="px-3 py-1.5 text-left font-medium">Expected Phase</th>
            </tr>
          </thead>
          <tbody>
            {EA_TABLE.map((r) => (
              <tr key={r.range} className="border-t border-border">
                <td className="data-mono px-3 py-1.5">{r.range}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dopant && (
        <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
          <div className="mb-1 font-semibold">Dopant effect on e/a</div>
          <div className="data-mono space-y-0.5 text-muted-foreground">
            <div>Base e/a: {baseEa.toFixed(3)}</div>
            <div>
              With {dopant.el}: {ea.toFixed(3)}
            </div>
            <div className={ea - baseEa >= 0 ? "text-green-400" : "text-amber-400"}>
              Change: {ea - baseEa >= 0 ? "+" : ""}
              {(ea - baseEa).toFixed(3)}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
