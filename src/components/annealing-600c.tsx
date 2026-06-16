import { useMemo, useState } from "react";

// Annealing data at 600°C for Al57Cu33Fe10
// Source: Lee et al. (2020) Materials and Design
interface DataPoint {
  time: number;
  iPhase: number;
  grainRadius: number;
  hv: number;
  wearRate: number;
  friction: number;
}

const DATA: DataPoint[] = [
  { time: 0,  iPhase: 59.24, grainRadius: 3.47, hv: 712, wearRate: 2.21, friction: 0.363 },
  { time: 12, iPhase: 68.85, grainRadius: 6.65, hv: 736, wearRate: 1.16, friction: 0.331 },
  { time: 24, iPhase: 75.84, grainRadius: 8.62, hv: 750, wearRate: 1.05, friction: 0.304 },
  { time: 36, iPhase: 81.75, grainRadius: 9.98, hv: 763, wearRate: 0.50, friction: 0.252 },
];

// Hardness prediction: HV = -0.01034 X² + 3.821 X + 521.6   (X = i-phase %)
function predictHV(x: number) {
  return -0.01034 * x * x + 3.821 * x + 521.6;
}
const OPTIMAL_IPHASE = 86.37;

function TrendBar({ values, color, label, unit, min, max }: { values: number[]; color: string; label: string; unit: string; min?: number; max?: number }) {
  const vmin = min ?? Math.min(...values);
  const vmax = max ?? Math.max(...values);
  const range = vmax - vmin || 1;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground,#0f172a)" }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)" }}>{unit}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
        {values.map((v, i) => {
          const pct = ((v - vmin) / range) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, color: "var(--muted-foreground,#64748b)", fontFamily: "ui-monospace,monospace" }}>
                {v.toFixed(v < 10 ? 2 : 0)}
              </span>
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(4, pct)}%`,
                  minHeight: 4,
                  background: color,
                  borderRadius: "4px 4px 0 0",
                  opacity: 0.85,
                }}
              />
              <span style={{ fontSize: 9, color: "var(--muted-foreground,#64748b)" }}>{DATA[i].time}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Annealing600CPanel() {
  const [hovered, setHovered] = useState<number | null>(null);

  const trends = useMemo(() => {
    const iphase = DATA.map((d) => d.iPhase);
    const grain = DATA.map((d) => d.grainRadius);
    const hv = DATA.map((d) => d.hv);
    const wear = DATA.map((d) => d.wearRate);
    return { iphase, grain, hv, wear };
  }, []);

  const insights = [
    { label: "i-phase growth", from: "59.2%", to: "81.8%", delta: "+22.5 pp", good: true },
    { label: "Hardness gain", from: "712", to: "763", delta: "+51 HV", good: true },
    { label: "Wear rate drop", from: "2.21", to: "0.50", delta: "−77%", good: true },
    { label: "Grain coarsening", from: "3.47", to: "9.98", delta: "+6.51 μm", good: false },
  ];

  return (
    <div
      style={{
        background: "var(--card, #fff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 14,
        padding: 18,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
          Isothermal Annealing at 600 °C — Al₅₇Cu₃₃Fe₁₀
        </h3>
        <span
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(59,130,246,0.1)",
            color: "#3B82F6",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          TIME SERIES
        </span>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>
        Evolution of i-phase fraction, grain size, hardness, friction, and wear rate during isothermal anneal at 600 °C.{" "}
        <span style={{ fontStyle: "italic" }}>Source: Lee et al. (2020) Materials and Design.</span>
      </p>

      {/* Data cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 18,
        }}
      >
        {DATA.map((d, i) => {
          const isHovered = hovered === i;
          return (
            <div
              key={d.time}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                border: `1px solid ${isHovered ? "#3B82F655" : "var(--border,#e2e8f0)"}`,
                background: isHovered ? "rgba(59,130,246,0.06)" : "var(--card,#fff)",
                borderRadius: 10,
                padding: "10px 10px 12px",
                transition: "all 0.15s ease",
                cursor: "default",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", letterSpacing: "0.05em" }}>
                {d.time}h ANNEAL
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <MetricRow label="i-phase" value={`${d.iPhase.toFixed(2)}%`} />
                <MetricRow label="Grain radius" value={`${d.grainRadius.toFixed(2)} μm`} />
                <MetricRow label="Hardness" value={`${d.hv} HV`} />
                <MetricRow label="Friction μ" value={d.friction.toFixed(3)} />
                <MetricRow label="Wear rate" value={`${d.wearRate.toFixed(2)}×10⁻⁴ mm³/Nm`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend charts */}
      <div
        style={{
          borderTop: "1px dashed var(--border,#e2e8f0)",
          paddingTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        <TrendBar values={trends.iphase} color="#22C55E" label="i-phase fraction" unit="%" />
        <TrendBar values={trends.grain} color="#F59E0B" label="Grain radius" unit="μm" />
        <TrendBar values={trends.hv} color="#3B82F6" label="Vickers hardness" unit="HV" />
        <TrendBar values={trends.wear} color="#EF4444" label="Wear rate" unit="×10⁻⁴ mm³/Nm" />
      </div>

      {/* Insights */}
      <div
        style={{
          borderTop: "1px dashed var(--border,#e2e8f0)",
          paddingTop: 14,
          marginTop: 14,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground,#0f172a)", marginBottom: 8 }}>
          Key Trends (0 h → 36 h)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {insights.map((ins) => (
            <div
              key={ins.label}
              style={{
                borderRadius: 8,
                padding: "8px 10px",
                background: ins.good ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${ins.good ? "#22C55E44" : "#EF444444"}`,
              }}
            >
              <div style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)", marginBottom: 2 }}>{ins.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: ins.good ? "#22C55E" : "#EF4444" }}>
                {ins.delta}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted-foreground,#64748b)", marginTop: 2, fontFamily: "ui-monospace,monospace" }}>
                {ins.from} → {ins.to}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimal concentration banner */}
      <div
        style={{
          marginTop: 14,
          borderRadius: 10,
          padding: "10px 12px",
          background: "rgba(34,197,94,0.10)",
          border: "1px solid #22C55E55",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 18, color: "#22C55E", fontWeight: 700 }}>★</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#22C55E" }}>
            Optimal concentration: {OPTIMAL_IPHASE}% i-phase (minimum wear rate)
          </div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)", marginTop: 2 }}>
            Extrapolated optimum beyond 36 h — wear rate minimized at peak i-phase fraction.
          </div>
        </div>
      </div>

      {/* Hardness prediction formula */}
      <div
        style={{
          marginTop: 10,
          borderRadius: 10,
          padding: "10px 12px",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid #3B82F655",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", marginBottom: 4 }}>
          Hardness prediction (Lee et al. 2020)
        </div>
        <div style={{ fontSize: 12, fontFamily: "ui-monospace,monospace", color: "var(--foreground,#0f172a)" }}>
          HV = −0.01034·X² + 3.821·X + 521.6
        </div>
        <div style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)", marginTop: 4 }}>
          where X = i-phase fraction (%). At X = {OPTIMAL_IPHASE}% → HV ≈ {predictHV(OPTIMAL_IPHASE).toFixed(1)}.
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "var(--muted-foreground,#64748b)" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground,#0f172a)", fontFamily: "ui-monospace,monospace" }}>
        {value}
      </span>
    </div>
  );
}
