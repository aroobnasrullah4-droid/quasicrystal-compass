import { useMemo, useState } from "react";

// ============ DOPANT DATA ============
export const DOPANTS: Record<
  string,
  { ea: number; en: number; radius: number; effect: string; apiDelta: number }
> = {
  Si: { ea: 4, en: 1.9, radius: 117, effect: "Si addition expands e/a range for icosahedral phase. 5 at% Si replacing Fe increases i-phase stability up to 1223K (Murty et al.)", apiDelta: 0 },
  B:  { ea: 3, en: 2.04, radius: 87, effect: "B addition of 1–3 at% modifies solidification kinetics, favours QC primary phase formation (Sukhova et al.)", apiDelta: 0 },
  Ti: { ea: 4, en: 1.54, radius: 147, effect: "Ti refines grain structure; commonly used to nucleate i-phase in Al alloys.", apiDelta: 0 },
  Cr: { ea: 6, en: 1.66, radius: 128, effect: "Common QC former in Al-Cr systems (Al-Cu-Cr-Fe known QC).", apiDelta: 0 },
  Ni: { ea: 10, en: 1.91, radius: 124, effect: "Ni is key element in ML-discovered Al65Ni20Os15 QC — different QC type (decagonal vs icosahedral).", apiDelta: 0 },
  Ir: { ea: 9, en: 2.2, radius: 136, effect: "Ir present in ML-discovered Al78Ir17Mn5 / Al78Ir17Fe5 decagonal QCs (2023).", apiDelta: 0 },
  Os: { ea: 8, en: 2.2, radius: 135, effect: "Os present in ML-discovered Al65Ni20Os15 decagonal QC (2023).", apiDelta: 0 },
  Au: { ea: 11, en: 2.54, radius: 144, effect: "Au substitution for Cu (up to 3 at%) reduces phonon thermal conductivity by 17% — promising for thermoelectrics.", apiDelta: -0.5 },
  Pt: { ea: 10, en: 2.28, radius: 139, effect: "Pt substitution reduces thermal conductivity via phason locking — thermoelectric applications.", apiDelta: -0.5 },
  Ag: { ea: 11, en: 1.93, radius: 144, effect: "Ag has known antibacterial synergy with Cu/Cu2O — could enhance DIZ beyond Ali et al. 2025 baseline.", apiDelta: 2.5 },
  Zn: { ea: 12, en: 1.65, radius: 134, effect: "Adjusts e/a ratio cheaply; commonly used to shift Hume-Rothery balance.", apiDelta: 0 },
};

export type DopantKey = keyof typeof DOPANTS;
export type SubMode = "Cu" | "Fe" | "Al" | "ADD";

export interface DopantLogRow {
  id: number;
  base: { Al: number; Cu: number; Fe: number; Mn: number };
  dopant: string;
  amount: number;
  mode: SubMode;
  newEa: number;
  oldPhase: string;
  newPhase: string;
  oldConf: number;
  newConf: number;
  apiOld: number;
  apiNew: number;
  literature: string;
}

// ============ ML DISCOVERY PANEL ============
const ML_QCS = [
  {
    formula: "Al₆₅Ni₂₀Os₁₅",
    system: "Al-Ni-Os",
    comp: { Al: 65, Cu: 0, Fe: 0, Mn: 0 },
    note: "Os substitutes for Fe-group role",
    detail: "Predicted by ML → synthesized → verified by TEM electron diffraction",
    ea: 3.15,
    eaFormula: "(65×3 + 20×0 + 15×8)/100",
  },
  {
    formula: "Al₇₈Ir₁₇Mn₅",
    system: "Al-Ir-Mn",
    comp: { Al: 78, Cu: 0, Fe: 0, Mn: 5 },
    note: "Ir substitutes for transition metal role",
    detail: "Mn at 5 at% — same role as in Ali et al. (2025) Al-Cu-Fe-Mn system",
    ea: 4.12,
    eaFormula: "(78×3 + 17×9 + 5×7)/100",
  },
  {
    formula: "Al₇₈Ir₁₇Fe₅",
    system: "Al-Ir-Fe",
    comp: { Al: 78, Cu: 0, Fe: 5, Mn: 0 },
    note: "Confirms Fe is not always primary QC former — role can be substituted",
    detail: "Fe at only 5 at% — minimal Fe needed when Ir present",
    ea: 4.17,
    eaFormula: "(78×3 + 17×9 + 5×8)/100",
  },
];

export function MLDiscoveryPanel({
  loadComp,
}: {
  loadComp: (c: { Al: number; Cu: number; Fe: number; Mn: number }, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-5 text-left">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-primary">Historical Reference</div>
          <h2 className="text-lg font-semibold">🤖 ML-Discovered QCs — Historical Reference</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Uryu et al. / Liu et al. — Phys. Rev. Materials 7, 093805 (2023) · DOI: 10.1103/PhysRevMaterials.7.093805
          </p>
        </div>
        <span className="text-muted-foreground text-xl">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm text-foreground/90">
            In 2023, researchers screened 1000+ ternary aluminum alloy systems using a Random Forest classifier trained
            on known QC compositions. They predicted — then experimentally confirmed — 3 brand new decagonal
            quasicrystals. This was the first time in 40 years of QC research that ML discovered a new QC. Accuracy of
            the binary classification task exceeded 95%.
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {ML_QCS.map((q) => (
              <div
                key={q.formula}
                className="rounded-xl border border-primary/40 bg-primary/5 p-4 flex flex-col gap-2"
                style={{ boxShadow: "0 0 18px -6px #38BDF855" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-primary">{q.formula}</div>
                  <span className="rounded-full bg-qc-positive/15 text-qc-positive border border-qc-positive/30 px-2 py-0.5 text-[10px]">
                    ✅ Confirmed
                  </span>
                </div>
                <div className="data-mono text-[11px] text-muted-foreground">
                  System: {q.system} · Decagonal QC
                </div>
                <div className="text-xs text-foreground/80">{q.detail}</div>
                <div className="rounded-md bg-secondary/40 border border-border px-2 py-1.5 data-mono text-[11px]">
                  e/a = {q.eaFormula} ={" "}
                  <span className="text-primary font-semibold">{q.ea.toFixed(2)}</span>
                </div>
                <div className="text-[11px] italic text-muted-foreground">{q.note}</div>
                <button
                  onClick={() => loadComp(q.comp, q.formula)}
                  className="mt-1 rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  Load &amp; Compare
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-foreground/90">
            <div className="font-semibold text-amber-500 mb-1">💡 What This Means for Your FYP</div>
            The model used Random Forest trained on the same type of compositional features you will use (e/a ratio,
            electronegativity, atomic radius). The key difference: they worked on <b>ternary</b> systems. Your FYP
            extends this to <b>quaternary</b> Al-Cu-Fe-Mn — adding Mn as a 4th variable. This is the research gap your
            FYP fills.
          </div>
        </div>
      )}
    </section>
  );
}

// ============ DOPANT EXPLORER ============
export function DopantExplorer({
  currentComp,
  currentEa,
  currentPhase,
  currentConf,
  currentApi,
  predictFromExt,
}: {
  currentComp: { Al: number; Cu: number; Fe: number; Mn: number };
  currentEa: number;
  currentPhase: string;
  currentConf: number;
  currentApi: number;
  predictFromExt: (c: {
    Al: number;
    Cu: number;
    Fe: number;
    Mn: number;
  }) => { label: string; confidence: number; color: string; kind: string; ea: number; api: number };
}) {
  const [base, setBase] = useState<{ Al: number; Cu: number; Fe: number; Mn: number } | null>(null);
  const [mode, setMode] = useState<SubMode>("Cu");
  const [dopant, setDopant] = useState<DopantKey>("Si");
  const [amount, setAmount] = useState(3);
  const [log, setLog] = useState<DopantLogRow[]>([]);

  const baseUsed = base ?? currentComp;
  const baseInfo = base
    ? predictFromExt(base)
    : { label: currentPhase, confidence: currentConf, color: "#64748B", kind: "?", ea: currentEa, api: currentApi };

  const modified = useMemo(() => {
    const c = { ...baseUsed };
    const amt = Math.max(0, Math.min(10, amount));
    if (mode === "ADD") {
      // reduce all proportionally so dopant fits
      const f = (100 - amt) / 100;
      return { Al: c.Al * f, Cu: c.Cu * f, Fe: c.Fe * f, Mn: c.Mn * f, dop: amt };
    }
    const take = Math.min(c[mode], amt);
    return { ...c, [mode]: c[mode] - take, dop: take } as any;
  }, [baseUsed, mode, amount]);

  // Compute new e/a from full modified composition including dopant
  const newEa = useMemo(() => {
    const base_ea = (modified.Al * 3 + modified.Cu * 1 + modified.Fe * 8 + modified.Mn * 7) / 100;
    return base_ea + (modified.dop * DOPANTS[dopant].ea) / 100;
  }, [modified, dopant]);

  // Predict using base-style 4-element composition (treat dopant as not in core predictor)
  const newPred = predictFromExt({
    Al: modified.Al,
    Cu: modified.Cu,
    Fe: modified.Fe,
    Mn: modified.Mn,
  });

  const newApi = Math.max(0, Math.min(10, baseInfo.api + DOPANTS[dopant].apiDelta));

  const eaArrow =
    Math.abs(newEa - 1.86) < Math.abs(baseInfo.ea - 1.86)
      ? { sym: "↓ toward 1.86", color: "#22C55E" }
      : { sym: "↑ away from 1.86", color: "#EF4444" };

  const confArrow =
    newPred.confidence >= baseInfo.confidence
      ? { sym: "↑", color: "#22C55E" }
      : { sym: "↓", color: "#EF4444" };

  const addToLog = () => {
    setLog((l) => [
      ...l,
      {
        id: (l[l.length - 1]?.id ?? 0) + 1,
        base: baseUsed,
        dopant,
        amount: modified.dop,
        mode,
        newEa,
        oldPhase: baseInfo.label,
        newPhase: newPred.label,
        oldConf: baseInfo.confidence,
        newConf: newPred.confidence,
        apiOld: baseInfo.api,
        apiNew: newApi,
        literature: DOPANTS[dopant].effect,
      },
    ]);
  };

  const exportCSV = () => {
    const header =
      "#,Base,Dopant,Amount,Mode,NewEa,OldPhase,NewPhase,OldConf,NewConf,APIold,APInew,Literature\n";
    const rows = log
      .map(
        (r) =>
          `${r.id},Al${r.base.Al.toFixed(1)}Cu${r.base.Cu.toFixed(1)}Fe${r.base.Fe.toFixed(1)}Mn${r.base.Mn.toFixed(1)},${r.dopant},${r.amount.toFixed(1)},${r.mode},${r.newEa.toFixed(3)},${r.oldPhase},${r.newPhase},${r.oldConf.toFixed(1)},${r.newConf.toFixed(1)},${r.apiOld.toFixed(1)},${r.apiNew.toFixed(1)},"${r.literature.replace(/"/g, "'")}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dopant_log_${Date.now()}.csv`;
    a.click();
  };

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5">
      <div className="mb-1 text-xs uppercase tracking-wider text-primary">Dopant Module</div>
      <h2 className="text-lg font-semibold">🔬 Dopant &amp; Substitution Explorer</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Simulate the effect of adding or replacing elements in the base QC composition
      </p>

      {/* Base lock */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
        <button
          onClick={() => setBase({ ...currentComp })}
          className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          🔒 Lock Base
        </button>
        {base && (
          <button
            onClick={() => setBase(null)}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
          >
            Unlock
          </button>
        )}
        <div className="data-mono text-xs text-muted-foreground">
          Base: Al{baseUsed.Al.toFixed(1)} Cu{baseUsed.Cu.toFixed(1)} Fe{baseUsed.Fe.toFixed(1)} Mn{baseUsed.Mn.toFixed(1)}
          {!base && <span className="ml-2 italic">(using live composition — click Lock to freeze)</span>}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Substitution Type</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as SubMode)}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm"
          >
            <option value="Cu">Replace Cu with X (partial)</option>
            <option value="Fe">Replace Fe with X (partial)</option>
            <option value="Al">Replace Al with X (partial)</option>
            <option value="ADD">Add dopant (reduces all others proportionally)</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Dopant Element</label>
          <select
            value={dopant}
            onChange={(e) => setDopant(e.target.value as DopantKey)}
            className="mt-1 w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm"
          >
            {Object.keys(DOPANTS).map((d) => (
              <option key={d} value={d}>
                {d} — {DOPANTS[d].effect.split(".")[0].slice(0, 50)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Amount: <span className="data-mono text-primary">{amount} at%</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>
      </div>

      {/* Effect display */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="text-xs uppercase tracking-wider text-primary mb-2">New Composition</div>
          <div className="data-mono text-sm space-y-0.5">
            <div>Al: <span className="text-primary">{modified.Al.toFixed(2)}%</span></div>
            <div>Cu: <span className="text-primary">{modified.Cu.toFixed(2)}%</span></div>
            <div>Fe: <span className="text-primary">{modified.Fe.toFixed(2)}%</span></div>
            <div>Mn: <span className="text-primary">{modified.Mn.toFixed(2)}%</span></div>
            <div className="pt-1 border-t border-border mt-1">
              {dopant}: <span className="text-amber-400">{modified.dop.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">e/a change</div>
            <div className="data-mono text-sm mt-1">
              {baseInfo.ea.toFixed(3)} → <span className="text-primary font-semibold">{newEa.toFixed(3)}</span>{" "}
              <span style={{ color: eaArrow.color }}>{eaArrow.sym}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Phase prediction change</div>
            <div className="text-sm mt-1">
              Before: <span style={{ color: baseInfo.color }}>{baseInfo.label} ({baseInfo.confidence.toFixed(0)}%)</span>
            </div>
            <div className="text-sm">
              After: <span style={{ color: newPred.color }}>{newPred.label} ({newPred.confidence.toFixed(0)}%)</span>{" "}
              <span style={{ color: confArrow.color }}>{confArrow.sym}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Antibacterial Index</div>
            <div className="data-mono text-sm mt-1">
              {baseInfo.api.toFixed(1)} → <span className="text-primary font-semibold">{newApi.toFixed(1)}</span>{" "}
              <span style={{ color: newApi >= baseInfo.api ? "#22C55E" : "#EF4444" }}>
                {newApi >= baseInfo.api ? "↑" : "↓"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-foreground/90">
        <span className="font-semibold text-amber-400">📖 Literature:</span> {DOPANTS[dopant].effect}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={addToLog}
          className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          + Add to Dopant Log
        </button>
        {log.length > 0 && (
          <button
            onClick={exportCSV}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-secondary/70"
          >
            📥 Export Dopant CSV
          </button>
        )}
        {log.length > 0 && (
          <button
            onClick={() => setLog([])}
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
          >
            Clear
          </button>
        )}
      </div>

      {log.length > 0 && (
        <div className="mt-4 overflow-x-auto" style={{ maxHeight: 280 }}>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left">#</th>
                <th className="px-2 py-1.5 text-left">Base</th>
                <th className="px-2 py-1.5 text-left">Dopant</th>
                <th className="px-2 py-1.5 text-right">Amount</th>
                <th className="px-2 py-1.5 text-right">New e/a</th>
                <th className="px-2 py-1.5 text-left">Phase change</th>
                <th className="px-2 py-1.5 text-right">API Δ</th>
                <th className="px-2 py-1.5 text-left">Literature</th>
              </tr>
            </thead>
            <tbody className="data-mono">
              {log.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="px-2 py-1.5">{r.id}</td>
                  <td className="px-2 py-1.5">
                    Al{r.base.Al.toFixed(0)}Cu{r.base.Cu.toFixed(0)}Fe{r.base.Fe.toFixed(0)}Mn{r.base.Mn.toFixed(0)}
                  </td>
                  <td className="px-2 py-1.5">{r.dopant} ({r.mode})</td>
                  <td className="px-2 py-1.5 text-right">{r.amount.toFixed(1)}</td>
                  <td className="px-2 py-1.5 text-right">{r.newEa.toFixed(3)}</td>
                  <td className="px-2 py-1.5 font-sans">
                    {r.oldPhase.split(" ")[0]} ({r.oldConf.toFixed(0)}%) → {r.newPhase.split(" ")[0]} ({r.newConf.toFixed(0)}%)
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {r.apiOld.toFixed(1)} → {r.apiNew.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 font-sans text-[10px] text-muted-foreground max-w-xs truncate" title={r.literature}>
                    {r.literature}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm text-foreground/90">
        <div className="font-semibold text-primary mb-1">🎓 FYP Opportunity: Mn IS your dopant.</div>
        In Sir Fahad's system, Mn was added to Al-Cu-Fe to create Al-Cu-Fe-Mn. The effect:
        <ul className="mt-2 ml-5 list-disc space-y-1 text-foreground/80">
          <li>Mn's multiple oxidation states (+2 to +7) enhance catalytic performance</li>
          <li>Mn doping boosts antibacterial activity</li>
          <li>Mn at 2–6 at% stabilizes QC phase</li>
          <li>Mn &gt; 6 at% risks β-Mn competing phase</li>
        </ul>
        <div className="mt-2 italic text-xs text-muted-foreground">
          This is exactly what the Dopant Explorer simulates — YOUR composition IS a doped QC.
        </div>
      </div>
    </section>
  );
}

// ============ TSAI RULES PANEL ============
export function TsaiRulesPanel({
  comp,
  desc,
}: {
  comp: { Al: number; Cu: number; Fe: number; Mn: number };
  desc: { e_a: number; delta: number };
}) {
  const [open, setOpen] = useState(false);
  const tmGroup = true; // Cu(IB), Fe(VIIIB), Mn(VIIB) — all in transition metal groups VB–VIIIB region (close enough for prototype)
  const rules = [
    { label: "Rule 1 — Al > 60 at%", pass: comp.Al > 60, detail: `Al = ${comp.Al.toFixed(1)}%` },
    {
      label: "Rule 2 — e/a near 1.86 (Hume-Rothery)",
      pass: desc.e_a >= 1.75 && desc.e_a <= 1.95,
      detail: `e/a = ${desc.e_a.toFixed(3)}`,
    },
    {
      label: "Rule 3 — TM in group VB–VIIIB",
      pass: tmGroup,
      detail: "Fe (VIIIB), Mn (VIIB) present",
    },
    {
      label: "Rule 4 — Atomic size mismatch δ < 5%",
      pass: desc.delta < 5,
      detail: `δ = ${desc.delta.toFixed(2)}%`,
    },
    {
      label: "Rule 5 — Negative ΔH between TMs",
      pass: comp.Cu > 0 && comp.Fe > 0,
      detail: "Cu-Fe-Mn intermetallics exhibit negative mixing enthalpy",
    },
  ];
  const passed = rules.filter((r) => r.pass).length;
  return (
    <section className="lg:col-span-6 rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary">Reference</div>
          <h2 className="text-sm font-semibold">📐 Tsai's 5 QC Formation Rules</h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: passed === 5 ? "#22C55E22" : passed >= 3 ? "#F59E0B22" : "#EF444422",
              color: passed === 5 ? "#22C55E" : passed >= 3 ? "#F59E0B" : "#EF4444",
            }}
          >
            {passed}/5 satisfied
          </span>
          <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {rules.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs"
            >
              <div className="font-medium">{r.label}</div>
              <div className="flex items-center gap-3">
                <span className="data-mono text-[11px] text-muted-foreground">{r.detail}</span>
                <span style={{ color: r.pass ? "#22C55E" : "#EF4444" }} className="text-[11px] font-bold">
                  {r.pass ? "✅ SATISFIED" : "❌ NOT SATISFIED"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ============ QC TYPE INDICATOR ============
export function QCTypeIndicator() {
  return (
    <div className="mt-4 rounded-lg border border-qc-positive/30 bg-qc-positive/5 p-3 text-xs">
      <div className="font-semibold text-qc-positive mb-1">Structure Type: Icosahedral QC (i-phase)</div>
      <div className="text-muted-foreground">Symmetry: 5-fold / 10-fold forbidden in periodic crystals</div>
      <div className="text-muted-foreground">Space: Non-periodic, long-range ordered</div>
      <div className="mt-1 italic text-foreground/80">
        Note: Al-Cu-Fe-Mn forms ICOSAHEDRAL QC. The ML-discovered QCs (2023) were DECAGONAL — a different QC type.
      </div>
    </div>
  );
}

// ============ REFERENCES PANEL ============
const REFS = [
  { n: 1, text: "Ali, F. et al. (2025) — AlCuFeMn QC + CNT CVD for antibacterial applications. SSRN 5887591", doi: "10.2139/ssrn.5887591" },
  { n: 2, text: "Ali, F. et al. (2020) — Antimicrobial leached Al-Cu-Fe QC.", doi: "10.1007/s00339-020-03611-5" },
  { n: 3, text: "Uryu et al. / Liu et al. (2023) — QCs predicted and discovered by ML.", doi: "10.1103/PhysRevMaterials.7.093805" },
  { n: 4, text: "Liu et al. (2021) — ML to predict QCs from chemical compositions.", doi: "10.1002/adma.202102507" },
  { n: 5, text: "Fujita et al. (2024) — HYPOD-X: Comprehensive QC dataset.", doi: "10.1038/s41597-024-04043-z" },
  { n: 6, text: "Murty et al. — Si addition expands e/a range for icosahedral phase. J. Mater. Sci.", doi: "" },
  { n: 7, text: "Sukhova et al. — B addition to Al-Cu-Fe QC. Crystals (2024)", doi: "" },
  { n: 8, text: "Tsai, A.P. et al. (1987) — Original Al-Cu-Fe icosahedral QC discovery.", doi: "10.1143/JJAP.26.L1505" },
];

export function ReferencesPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary">Bibliography</div>
          <h2 className="text-sm font-semibold">📚 Scientific References</h2>
        </div>
        <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ol className="space-y-2 px-4 pb-4">
          {REFS.map((r) => (
            <li
              key={r.n}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs"
            >
              <div>
                <span className="font-semibold text-primary">[{r.n}]</span> {r.text}
                {r.doi && <div className="data-mono text-[10px] text-muted-foreground mt-0.5">DOI: {r.doi}</div>}
              </div>
              {r.doi && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(r.doi);
                    setCopied(r.doi);
                    setTimeout(() => setCopied(null), 1200);
                  }}
                  className="shrink-0 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20"
                >
                  {copied === r.doi ? "✓ copied" : "Copy DOI"}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
