import { useMemo, useState } from "react";
import type { PredictHints } from "@/routes/index";

interface Comp { Al: number; Cu: number; Fe: number; Mn: number }
type DopantKey = "B" | "Si" | "Ag" | "Zn" | "Cr" | "Co";

const DOPANTS: { key: DopantKey; name: string; color: string; valence: number; hint: keyof PredictHints }[] = [
  { key: "B",  name: "Boron",     color: "#fbbf24", valence: 3.0,  hint: "b"  },
  { key: "Si", name: "Silicon",   color: "#94a3b8", valence: 4.0,  hint: "si" },
  { key: "Ag", name: "Silver",    color: "#e5e7eb", valence: 1.0,  hint: "ag" },
  { key: "Zn", name: "Zinc",      color: "#60a5fa", valence: 2.0,  hint: "zn" },
  { key: "Cr", name: "Chromium",  color: "#a78bfa", valence: -1.66, hint: "cr" },
  { key: "Co", name: "Cobalt",    color: "#f472b6", valence: -1.71, hint: "co" },
];

interface PredOut { kind: string; label: string; confidence: number; color: string; ea: number; api: number }

export function DopingTab({
  comp,
  basePred,
  predictFromExt,
}: {
  comp: Comp;
  basePred: { ea: number; confidence: number; label: string; kind: string };
  predictFromExt: (c: Comp, hints?: PredictHints) => PredOut;
}) {
  const [selected, setSelected] = useState<Record<DopantKey, number>>({
    B: 0, Si: 0, Ag: 0, Zn: 0, Cr: 0, Co: 0,
  });

  const totalDop = Object.values(selected).reduce((s, v) => s + v, 0);

  // Replace Al by dopant amount
  const dopedComp: Comp = useMemo(() => ({
    Al: Math.max(0, comp.Al - totalDop),
    Cu: comp.Cu,
    Fe: comp.Fe,
    Mn: comp.Mn,
  }), [comp, totalDop]);

  const hints: PredictHints = useMemo(() => {
    const h: PredictHints = {};
    DOPANTS.forEach((d) => { if (selected[d.key] > 0) (h as any)[d.hint] = selected[d.key]; });
    return h;
  }, [selected]);

  const newPred = useMemo(() => predictFromExt(dopedComp, hints), [dopedComp, hints, predictFromExt]);

  const eaDelta = newPred.ea - basePred.ea;

  const activeDopants = DOPANTS.filter((d) => selected[d.key] > 0);

  const mechanism = activeDopants.length === 0
    ? "No dopants selected. Select a dopant and amount to see its predicted effect on the QC phase."
    : activeDopants.map((d) => describeDopant(d.key, selected[d.key])).join(" ");

  // XRD shift: assume Δ2θ ~ +0.05° per 1% dopant valence delta
  const peakShift = activeDopants.reduce((s, d) => s + selected[d.key] * 0.04 * Math.sign(d.valence - 3), 0);

  return (
    <div className="space-y-4">
      {/* Section A — Dopant Selector */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section A</div>
        <h3 className="text-lg font-semibold mb-3">Dopant Selector</h3>
        <p className="text-xs text-muted-foreground mb-3">Select dopants (replaces equivalent Al at%). Range 0–10 at%.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DOPANTS.map((d) => {
            const active = selected[d.key] > 0;
            return (
              <div key={d.key} className="rounded-lg border bg-secondary/40 p-2" style={{ borderColor: active ? d.color + "88" : "" }}>
                <button
                  onClick={() => setSelected((s) => ({ ...s, [d.key]: s[d.key] > 0 ? 0 : 1 }))}
                  className="w-full text-left"
                >
                  <div className="text-sm font-bold" style={{ color: d.color }}>{d.key}</div>
                  <div className="text-[10px] text-muted-foreground">{d.name}</div>
                </button>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={10}
                  value={selected[d.key]}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(10, parseFloat(e.target.value) || 0));
                    setSelected((s) => ({ ...s, [d.key]: v }));
                  }}
                  className="mt-1 w-full rounded border border-border bg-card px-2 py-1 data-mono text-xs"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Section B — Effect */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section B</div>
        <h3 className="text-lg font-semibold mb-3">Predicted Effect on QC Phase</h3>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">e/a ratio change</div>
            <div className="mt-1 flex items-baseline gap-2 data-mono">
              <span className="text-base">{basePred.ea.toFixed(3)}</span>
              <span className="text-primary">→</span>
              <span className="text-lg font-bold" style={{ color: newPred.color }}>{newPred.ea.toFixed(3)}</span>
              <span className="text-xs" style={{ color: eaDelta >= 0 ? "#22C55E" : "#EF4444" }}>
                ({eaDelta >= 0 ? "+" : ""}{eaDelta.toFixed(3)})
              </span>
            </div>
            <HRBar value={newPred.ea} />
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Predicted phase (doped)</div>
            <div className="mt-1 text-lg font-bold" style={{ color: newPred.color }}>{newPred.label}</div>
            <div className="mt-1 text-xs">
              Confidence: <span className="data-mono" style={{ color: newPred.color }}>{newPred.confidence.toFixed(1)}%</span>
              <span className="ml-2 text-muted-foreground">
                (was {basePred.confidence.toFixed(1)}%
                <span style={{ color: newPred.confidence >= basePred.confidence ? "#22C55E" : "#EF4444" }}>
                  {" "}{newPred.confidence >= basePred.confidence ? "▲" : "▼"} {Math.abs(newPred.confidence - basePred.confidence).toFixed(1)}%
                </span>)
              </span>
            </div>
          </div>
        </div>

        {activeDopants.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeDopants.map((d) => (
              <div key={d.key} className="rounded-md border border-border bg-secondary/20 p-2 text-xs">
                <div className="font-semibold" style={{ color: d.color }}>{d.key} = {selected[d.key]} at%</div>
                <div className="text-muted-foreground mt-0.5">{shortEffect(d.key, selected[d.key])}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section C — Mechanism */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section C</div>
        <h3 className="text-lg font-semibold mb-3">Mechanism Explanation</h3>
        <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
          {activeDopants.length === 0 ? mechanism : (
            `Adding ${activeDopants.map((d) => `${selected[d.key]}% ${d.key}`).join(" + ")} to Al${comp.Al.toFixed(1)}Cu${comp.Cu.toFixed(1)}Fe${comp.Fe.toFixed(1)}Mn${comp.Mn.toFixed(1)}:
• Replaces Al in the lattice (Al ${comp.Al.toFixed(1)} → ${dopedComp.Al.toFixed(1)} at%)
• Changes e/a from ${basePred.ea.toFixed(3)} to ${newPred.ea.toFixed(3)}
• Expected phase: ${newPred.label}
${mechanism}
• Recommendation: ${recommendation(newPred, basePred)}`
          )}
        </div>
      </section>

      {/* Section D — Summary + XRD shift */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 text-xs uppercase tracking-wider text-primary">Section D</div>
        <h3 className="text-lg font-semibold mb-3">Doped Composition Summary</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 data-mono text-xs">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Final composition</div>
            <div>Al: {dopedComp.Al.toFixed(2)}</div>
            <div>Cu: {dopedComp.Cu.toFixed(2)}</div>
            <div>Fe: {dopedComp.Fe.toFixed(2)}</div>
            <div>Mn: {dopedComp.Mn.toFixed(2)}</div>
            {activeDopants.map((d) => (
              <div key={d.key} style={{ color: d.color }}>{d.key}: {selected[d.key].toFixed(2)}</div>
            ))}
            <div className="mt-1 border-t border-border pt-1">
              Total: {(dopedComp.Al + dopedComp.Cu + dopedComp.Fe + dopedComp.Mn + totalDop).toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Predicted XRD peak shift</div>
            <div className="mt-1 data-mono text-2xl font-bold" style={{ color: peakShift === 0 ? "#94a3b8" : peakShift > 0 ? "#22C55E" : "#F59E0B" }}>
              Δ2θ = {peakShift >= 0 ? "+" : ""}{peakShift.toFixed(3)}°
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {peakShift === 0 ? "No lattice change predicted." :
               peakShift > 0 ? "Peaks shift to higher angles → lattice contraction." :
               "Peaks shift to lower angles → lattice expansion."}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function describeDopant(k: DopantKey, amt: number): string {
  switch (k) {
    case "B":
      if (amt > 0 && amt <= 3) return `B (${amt}%): +8% stability, grain refinement.`;
      if (amt > 3) return `B (${amt}%): -15% stability, porosity risk.`;
      return "";
    case "Si":
      if (amt > 0 && amt <= 2) return `Si (${amt}%): +10% QC volume fraction.`;
      if (amt > 5) return `Si (${amt}%): phase shifts to approximant.`;
      return `Si (${amt}%): mild approximant tendency.`;
    case "Ag":
      return `Ag (${amt}%): neutral on QC, adds antibacterial Cu/Cu₂O synergy.`;
    case "Zn":
      if (amt <= 4) return `Zn (${amt}%): tunes e/a, QC+β retained, +DIZ.`;
      return `Zn (${amt}%): exits validated 0.5–4 at% window.`;
    case "Cr":
      if (amt >= 3 && amt <= 8) return `Cr (${amt}%): i-QC → d-QC transition.`;
      return `Cr (${amt}%): i+d coexistence near 3 at%.`;
    case "Co":
      if (amt > 5) return `Co (${amt}%): decagonal QC formation (Kim 2002).`;
      return `Co (${amt}%): below decagonal threshold (≥5%).`;
  }
}

function shortEffect(k: DopantKey, amt: number): string {
  return describeDopant(k, amt);
}

function recommendation(newP: PredOut, base: { kind: string; confidence: number }): string {
  if (newP.kind === "QC" && newP.confidence > base.confidence) return "synthesize — doped formulation predicted to improve QC stability.";
  if (newP.kind === "DQC") return "test experimentally — decagonal QC variant predicted.";
  if (newP.kind === "APPROX") return "test experimentally — borderline approximant zone.";
  if (newP.kind === "ORDINARY") return "avoid — dopant pushes composition outside QC field.";
  return "test experimentally.";
}

function HRBar({ value }: { value: number }) {
  const min = 1.5, max = 2.3;
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  return (
    <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="absolute inset-y-0" style={{ left: `${((1.8 - min) / (max - min)) * 100}%`, width: `${((1.95 - 1.8) / (max - min)) * 100}%`, background: "#22C55E55" }} />
      <div className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `${pct}%` }} />
    </div>
  );
}
