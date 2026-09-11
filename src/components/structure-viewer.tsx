import { useMemo } from "react";
import { Panel } from "@/components/panel";
import {
  ATOM_COLORS,
  dopantColor,
  dopantSite,
  type Dist,
  type Entry,
  type PhaseKey,
} from "@/lib/phase-core";

// Icosahedral cluster projected onto 2D (5-fold rosette + inner shell)
function clusterPoints(cx: number, cy: number, r: number, n: number, phase = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i * 2 * Math.PI) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

export function StructureViewer({
  entries,
  dominant,
  dist,
  dopant,
  loading,
}: {
  entries: Entry[];
  dominant: PhaseKey | null;
  dist: Dist | null;
  dopant: Entry | null;
  loading: boolean;
}) {
  const total = entries.reduce((s, e) => s + (e.amt || 0), 0) || 1;
  const frac = (el: string) => (entries.find((e) => e.el === el)?.amt ?? 0) / total;

  const geometry = useMemo(() => {
    const cx = 150;
    const cy = 130;
    const isDecagonal = dominant === "DQC";
    const periodic = dominant === "BETA" || dominant === "LAMBDA" || dominant === "THETA";
    if (periodic) {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++) pts.push({ x: 50 + i * 50, y: 30 + j * 50 });
      return { pts, rings: [] as { x: number; y: number }[][], kind: "periodic" as const };
    }
    const n = isDecagonal ? 10 : 5;
    const outer = clusterPoints(cx, cy, 95, n, -Math.PI / 2);
    const mid = clusterPoints(cx, cy, 58, n, -Math.PI / 2 + Math.PI / n);
    const inner = clusterPoints(cx, cy, 26, n, -Math.PI / 2);
    return {
      pts: [{ x: cx, y: cy }, ...inner, ...mid, ...outer],
      rings: [inner, mid, outer],
      kind: isDecagonal ? ("decagonal" as const) : ("icosahedral" as const),
    };
  }, [dominant]);

  // Deterministic species assignment matching composition fractions
  const atoms = geometry.pts.map((p, i) => {
    const t = (i * 0.6180339887) % 1;
    const fAl = frac("Al");
    const fCu = frac("Cu");
    const fFe = frac("Fe");
    let el = "Al";
    if (t > fAl + fCu + fFe && dopant) el = dopant.el;
    else if (t > fAl + fCu) el = "Fe";
    else if (t > fAl) el = "Cu";
    const color = ATOM_COLORS[el] ?? dopantColor(el);
    return { ...p, el, color, r: el === "Al" ? 6.5 : el === "Cu" ? 7.5 : 7 };
  });

  const site = dopant ? dopantSite(dopant.el) : null;
  const symmetry =
    geometry.kind === "icosahedral"
      ? "5-fold icosahedral symmetry (m-3-5), quasiperiodic"
      : geometry.kind === "decagonal"
        ? "10-fold decagonal symmetry — periodic along one axis"
        : "Periodic crystal lattice — no forbidden symmetry";

  return (
    <Panel
      title="Crystal Structure Viewer"
      subtitle={`Projected cluster · ${dominant ?? "—"}`}
      loading={loading}
    >
      <div className="rounded-lg border border-border bg-secondary/30">
        <svg viewBox="0 0 300 260" className="h-64 w-full">
          {geometry.rings.map((ring, ri) => (
            <polygon
              key={ri}
              points={ring.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.8"
              opacity={0.7}
            />
          ))}
          {geometry.rings[2]?.map((p, i) => (
            <line
              key={`s${i}`}
              x1={150}
              y1={130}
              x2={p.x}
              y2={p.y}
              stroke="hsl(var(--border))"
              strokeWidth="0.6"
              opacity={0.5}
            />
          ))}
          {atoms.map((a, i) => (
            <circle key={i} cx={a.x} cy={a.y} r={a.r} fill={a.color} opacity={0.92}>
              <title>{a.el}</title>
            </circle>
          ))}
          <text x="150" y="248" textAnchor="middle" fontSize="9" fill="#64748b">
            {geometry.kind === "periodic" ? "Unit-cell projection" : "Cluster projection along 5-fold axis"}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {["Al", "Cu", "Fe"].map((el) => (
          <span key={el} className="flex items-center gap-1.5 rounded border border-border px-2 py-0.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: ATOM_COLORS[el] }}
            />
            {el} {(frac(el) * 100).toFixed(1)}%
          </span>
        ))}
        {dopant && (
          <span className="flex items-center gap-1.5 rounded border border-border px-2 py-0.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: dopantColor(dopant.el) }}
            />
            {dopant.el} {dopant.amt}%
          </span>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        {symmetry}
        {dist && dominant && (
          <span className="ml-1 text-foreground">· {dist[dominant].toFixed(1)}% phase fraction</span>
        )}
      </div>

      {site && (
        <div className="mt-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
          <span className="font-semibold">{dopant?.el} site: </span>
          <span className="text-muted-foreground">{site.text}</span>
        </div>
      )}
    </Panel>
  );
}
