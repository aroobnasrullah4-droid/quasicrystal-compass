import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface Peak {
  pos: number;
  intensity: number;
  label: string;
}
interface XRDProps {
  phaseKind: "QC" | "APPROX" | "ORDINARY";
  cntYield?: number;
}

const QC_PEAKS: Peak[] = [
  { pos: 21.8, intensity: 45, label: "(18/29,0,0) QC" },
  { pos: 23.5, intensity: 60, label: "(20/32,0,0) QC" },
  { pos: 40.7, intensity: 100, label: "Main QC peak ★" },
  { pos: 42.9, intensity: 55, label: "QC" },
  { pos: 47.5, intensity: 35, label: "QC" },
  { pos: 69.5, intensity: 25, label: "QC" },
];
const APPROX_PEAKS: Peak[] = [
  { pos: 22.1, intensity: 40, label: "(110) β-phase" },
  { pos: 40.2, intensity: 100, label: "(211) approximant ★" },
  { pos: 43.2, intensity: 60, label: "(220)" },
];
const NONQC_PEAKS: Peak[] = [
  { pos: 38.5, intensity: 100, label: "Al (111)" },
  { pos: 44.7, intensity: 55, label: "Al (200)" },
  { pos: 65.1, intensity: 30, label: "Al (220)" },
  { pos: 78.2, intensity: 25, label: "Al (311)" },
];

// Build a series with sharp Gaussian-like peaks
function buildSeries(peaks: Peak[], step = 0.2) {
  const out: { x: number; y: number; label?: string }[] = [];
  for (let x = 20; x <= 80; x += step) {
    let y = 0;
    let lbl: string | undefined;
    for (const p of peaks) {
      const d = x - p.pos;
      const g = p.intensity * Math.exp(-(d * d) / (2 * 0.18 * 0.18));
      if (g > y) {
        y = g;
        if (Math.abs(d) < step / 2) lbl = p.label;
      }
    }
    out.push({ x: +x.toFixed(2), y: +y.toFixed(2), label: lbl });
  }
  return out;
}

export function XRDVisualizer({ phaseKind, cntYield = 0 }: XRDProps) {
  const [showQCOverlay, setShowQCOverlay] = useState(false);

  const { data, color, phaseNote } = useMemo(() => {
    const peaks =
      phaseKind === "QC" ? [...QC_PEAKS] : phaseKind === "APPROX" ? [...APPROX_PEAKS] : [...NONQC_PEAKS];
    if (cntYield > 0) peaks.push({ pos: 26.5, intensity: 30, label: "CNT (002) graphitic ✓" });
    const series = buildSeries(peaks);
    const overlay = showQCOverlay ? buildSeries(QC_PEAKS) : null;
    const merged = series.map((d, i) => ({ ...d, overlay: overlay ? overlay[i].y * 0.4 : null }));
    const color =
      phaseKind === "QC" ? "#22c55e" : phaseKind === "APPROX" ? "#f59e0b" : "#ef4444";
    const phaseNote =
      phaseKind === "QC"
        ? "5-fold symmetry peaks — forbidden in periodic crystals"
        : phaseKind === "APPROX"
          ? "Rational Miller indices — periodic crystal structure"
          : "Standard Al FCC peaks";
    return { data: merged, color, phaseNote };
  }, [phaseKind, cntYield, showQCOverlay]);

  const activePeaks =
    phaseKind === "QC" ? QC_PEAKS : phaseKind === "APPROX" ? APPROX_PEAKS : NONQC_PEAKS;

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">📊 XRD Pattern Preview</h2>
          <p className="text-xs text-muted-foreground">
            Simulated diffraction peaks based on predicted phase
          </p>
        </div>
        <button
          onClick={() => setShowQCOverlay((s) => !s)}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          {showQCOverlay ? "Hide" : "Show"} QC overlay
        </button>
      </div>

      <div className="mb-2 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-300">
        Simulated XRD — approximate peak positions only. Actual patterns require experimental
        diffraction.
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[20, 80]}
              ticks={[20, 30, 40, 50, 60, 70, 80]}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              label={{ value: "2θ (degrees)", position: "insideBottom", offset: -10, fill: "#64748b", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              domain={[0, 110]}
              label={{ value: "Intensity (%)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Intensity"]}
              labelFormatter={(x: number) => `2θ = ${x.toFixed(2)}°`}
            />
            {showQCOverlay && (
              <Line
                type="monotone"
                dataKey="overlay"
                stroke="#38bdf8"
                strokeOpacity={0.5}
                strokeDasharray="2 2"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {cntYield > 0 && (
              <ReferenceLine
                x={26.5}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{ value: "CNT (002)", fill: "#38bdf8", fontSize: 10, position: "top" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {activePeaks.map((p) => (
          <span
            key={p.pos + p.label}
            className="rounded border px-2 py-0.5 text-[10px] font-mono"
            style={{ borderColor: `${color}55`, color, background: `${color}10` }}
            title={`2θ=${p.pos}°, I=${p.intensity}%, ${p.label}`}
          >
            {p.pos}° · {p.label}
          </span>
        ))}
        {cntYield > 0 && (
          <span className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-300">
            26.5° · CNT (002) graphitic ✓
          </span>
        )}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        {phaseNote}. Peak positions based on Al-Cu-Fe i-phase literature. Ali et al. (2025) confirmed
        QC + CNT via XRD, SEM, EDX and Raman.
      </p>
    </section>
  );
}
