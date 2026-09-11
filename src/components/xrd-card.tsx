import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Panel } from "@/components/panel";
import { XRD_PATTERNS, type PhaseKey } from "@/lib/phase-core";

function buildSeries(peaks: { pos: number; int: number }[], step = 0.25) {
  const out: { x: number; y: number }[] = [];
  for (let x = 20; x <= 80; x += step) {
    let y = 0;
    for (const p of peaks) {
      const d = x - p.pos;
      y = Math.max(y, p.int * Math.exp(-(d * d) / (2 * 0.22 * 0.22)));
    }
    out.push({ x: +x.toFixed(2), y: +y.toFixed(2) });
  }
  return out;
}

export function XRDCard({
  dominant,
  loading,
}: {
  dominant: PhaseKey | null;
  loading: boolean;
}) {
  const [overlay, setOverlay] = useState<PhaseKey | "none">("none");
  const active = XRD_PATTERNS[dominant ?? "IQC"];

  const data = useMemo(() => {
    const main = buildSeries(active.peaks);
    const ov = overlay !== "none" ? buildSeries(XRD_PATTERNS[overlay].peaks) : null;
    return main.map((d, i) => ({ ...d, ov: ov ? ov[i].y * 0.5 : null }));
  }, [active, overlay]);

  return (
    <Panel
      title="XRD Pattern (simulated)"
      subtitle={`${active.label} · ${active.source}`}
      loading={loading}
      actions={
        <select
          value={overlay}
          onChange={(e) => setOverlay(e.target.value as PhaseKey | "none")}
          className="rounded border border-border bg-secondary px-2 py-1 text-xs"
          aria-label="Overlay reference pattern"
        >
          <option value="none">No overlay</option>
          {(Object.keys(XRD_PATTERNS) as PhaseKey[]).map((k) => (
            <option key={k} value={k}>
              Overlay: {XRD_PATTERNS[k].label}
            </option>
          ))}
        </select>
      }
    >
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 14 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[20, 80]}
              ticks={[20, 30, 40, 50, 60, 70, 80]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              label={{ value: "2θ (deg)", position: "insideBottom", offset: -8, fill: "#64748b", fontSize: 10 }}
            />
            <YAxis domain={[0, 110]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Intensity"]}
              labelFormatter={(x: number) => `2θ = ${Number(x).toFixed(2)}°`}
            />
            {overlay !== "none" && (
              <Line type="monotone" dataKey="ov" stroke={XRD_PATTERNS[overlay].color} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
            )}
            <Line type="monotone" dataKey="y" stroke={active.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {active.peaks.slice(0, 8).map((p) => (
          <span
            key={p.pos}
            className="data-mono rounded border px-1.5 py-0.5 text-[10px]"
            style={{ borderColor: `${active.color}55`, color: active.color, background: `${active.color}12` }}
          >
            {p.pos}°{p.hkl ? ` ${p.hkl}` : ""}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Simulated peak positions from reference patterns — confirm with experimental diffraction.
      </p>
    </Panel>
  );
}
