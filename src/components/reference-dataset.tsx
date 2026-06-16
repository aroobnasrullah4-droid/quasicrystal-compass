import { useMemo, useState } from "react";

type Comp = { Al: number; Cu: number; Fe: number; Mn: number };

interface RawRow {
  formula: string;
  Al: number;
  Cr: number;
  Cu: number;
  Fe: number;
  Mn: number;
  V: number;
  Ti: number;
  Ce: number;
  Co: number;
  phase: string;
  HV: number | null;
  UTS: number | null;
  source: string;
  temp_C?: number;
  time_h?: number;
  anneal_temp?: number;
  anneal_h?: number;
  i_phase_pct?: number;
  wear_rate?: number;
  friction?: number;
}

// Literature dataset (Inoue 2003; Shaitura & Sukhanov 2007)
const DATA: RawRow[] = [
  { formula: "Al84.6Cr15.4",            Al: 84.6, Cr: 15.4, Cu: 0,  Fe: 0,    Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "QC",     HV: 710, UTS: null, source: "Inoue 2003" },
  { formula: "Al94.5Cr3Ce1Co1.5",       Al: 94.5, Cr: 3,    Cu: 0,  Fe: 0,    Mn: 0, V: 0, Ti: 0, Ce: 1, Co: 1.5, phase: "QC+Al",  HV: null, UTS: 1340, source: "Inoue 2003" },
  { formula: "Al94V4Fe2",               Al: 94,   Cr: 0,    Cu: 0,  Fe: 2,    Mn: 0, V: 4, Ti: 0, Ce: 0, Co: 0,   phase: "Am+Al",  HV: null, UTS: 1390, source: "Inoue 2003" },
  { formula: "Al93Ti4Fe3",              Al: 93,   Cr: 0,    Cu: 0,  Fe: 3,    Mn: 0, V: 0, Ti: 4, Ce: 0, Co: 0,   phase: "Am+Al",  HV: 450, UTS: 1320, source: "Inoue 2003" },
  { formula: "Al93Fe3Cr2Ti2",           Al: 93,   Cr: 2,    Cu: 0,  Fe: 3,    Mn: 0, V: 0, Ti: 2, Ce: 0, Co: 0,   phase: "QC+Al",  HV: 192, UTS: 658, source: "Inoue 2003" },
  { formula: "Al65Cu20Fe15",            Al: 65,   Cr: 0,    Cu: 20, Fe: 15,   Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "i-QC",   HV: 520, UTS: null, source: "Shaitura 2007" },
  { formula: "Al64Cu18Fe8Cr8",          Al: 64,   Cr: 8,    Cu: 18, Fe: 8,    Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "i-QC",   HV: 550, UTS: null, source: "Shaitura 2007" },
  { formula: "Al67Cu9Fe10.5Cr10.5Si3",  Al: 67,   Cr: 10.5, Cu: 9,  Fe: 10.5, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "i-QC",   HV: 700, UTS: null, source: "Shaitura 2007" },

  // Paper 4 — Rosas & Perez 1998 (AlCuFe phase transitions)
  { formula: "Al65Cu20Fe15 (700°C/72h)", Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC",    HV: null, UTS: null, source: "Rosas 1998", temp_C: 700, time_h: 72 },
  { formula: "Al65Cu20Fe15 (900°C/8h)",  Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "β",       HV: null, UTS: null, source: "Rosas 1998", temp_C: 900, time_h: 8 },
  { formula: "Al65Cu20Fe15 (850°C/24h)", Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "QC+β",    HV: null, UTS: null, source: "Rosas 1998", temp_C: 850, time_h: 24 },
  { formula: "Al60Cu25Fe15 (700°C/72h)", Al: 60, Cr: 0, Cu: 25, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC",    HV: null, UTS: null, source: "Rosas 1998", temp_C: 700, time_h: 72 },

  // Paper 5 — Kim et al 2002 (AlCuFeCo Co-substitution)
  { formula: "Al65Cu20Fe15",             Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC",       HV: null, UTS: null, source: "Kim 2002" },
  { formula: "Al65Cu20Fe12Co3",          Al: 65, Cr: 0, Cu: 20, Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 3, phase: "i-QC+B2",    HV: null, UTS: null, source: "Kim 2002" },
  { formula: "Al65Cu20Fe10Co5",          Al: 65, Cr: 0, Cu: 20, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 5, phase: "i-QC+d-QC",  HV: null, UTS: null, source: "Kim 2002" },
  { formula: "Al65Cu20Fe7Co8",           Al: 65, Cr: 0, Cu: 20, Fe: 7,  Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 8, phase: "d-QC",       HV: null, UTS: null, source: "Kim 2002" },

  // Paper 6 — Lee et al 2020 (tribology, annealed at 600°C)
  { formula: "Al57Cu33Fe10 (600°C/0h)",  Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 712, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 0,  i_phase_pct: 59.24, wear_rate: 2.21e-4, friction: 0.363 },
  { formula: "Al57Cu33Fe10 (600°C/12h)", Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 736, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 12, i_phase_pct: 68.85, wear_rate: 1.16e-4, friction: 0.331 },
  { formula: "Al57Cu33Fe10 (600°C/24h)", Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 750, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 24, i_phase_pct: 75.84, wear_rate: 1.05e-4, friction: 0.304 },
  { formula: "Al57Cu33Fe10 (600°C/36h)", Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 763, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 36, i_phase_pct: 81.75, wear_rate: 0.50e-4, friction: 0.252 },
];

// Map dataset phase to predictor categories
function reportedKind(phase: string): "QC" | "APPROX" | "ORDINARY" {
  const p = phase.toLowerCase();
  if (p.includes("qc") || p.includes("i-qc") || p.includes("d-qc")) return "QC";
  if (p.includes("am") || p.includes("approx")) return "APPROX";
  return "ORDINARY";
}
  if (p.includes("am") || p.includes("approx")) return "APPROX";
  return "ORDINARY";
}

// Project to Al-Cu-Fe-Mn and renormalize to 100%
function projectAlCuFeMn(r: RawRow): { comp: Comp; otherPct: number } {
  const sub = r.Al + r.Cu + r.Fe + r.Mn;
  const total = r.Al + r.Cr + r.Cu + r.Fe + r.Mn + r.V + r.Ti + r.Ce + r.Co;
  const otherPct = Math.max(0, total - sub);
  if (sub <= 0) return { comp: { Al: 0, Cu: 0, Fe: 0, Mn: 0 }, otherPct };
  const f = 100 / sub;
  return {
    comp: { Al: r.Al * f, Cu: r.Cu * f, Fe: r.Fe * f, Mn: r.Mn * f },
    otherPct,
  };
}

interface Props {
  loadExternalComp: (c: Comp, label: string) => void;
  predictFromExt: (c: Comp) => { label: string; kind: string; confidence: number; color: string; ea: number; api: number };
}

export function ReferenceDataset({ loadExternalComp, predictFromExt }: Props) {
  const [showOnlyMatch, setShowOnlyMatch] = useState<"all" | "match" | "miss">("all");

  const rows = useMemo(() => {
    return DATA.map((r) => {
      const { comp, otherPct } = projectAlCuFeMn(r);
      const pred = predictFromExt(comp);
      const expected = reportedKind(r.phase);
      const match = pred.kind === expected;
      return { r, comp, otherPct, pred, expected, match };
    });
  }, [predictFromExt]);

  const stats = useMemo(() => {
    const total = rows.length;
    const matches = rows.filter((x) => x.match).length;
    return { total, matches, pct: total ? (matches / total) * 100 : 0 };
  }, [rows]);

  const filtered = rows.filter((x) =>
    showOnlyMatch === "all" ? true : showOnlyMatch === "match" ? x.match : !x.match
  );

  const kindColor = (k: string) =>
    k === "QC" ? "#22C55E" : k === "APPROX" ? "#F59E0B" : "#EF4444";

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-primary">Reference Dataset</div>
          <h2 className="text-lg font-semibold">📚 Literature Compositions — Predictor Calibration</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-element Al-base alloys from Inoue (2003) and Shaitura & Sukhanov (2007). Non-Al-Cu-Fe-Mn
            content is shown as <span className="text-amber-300">“other”</span> and the composition is
            projected onto the Al-Cu-Fe-Mn subspace before prediction.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="rounded-md border px-3 py-1.5 text-xs data-mono"
            style={{
              borderColor: stats.pct >= 60 ? "#22C55E55" : "#F59E0B55",
              background: stats.pct >= 60 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
              color: stats.pct >= 60 ? "#22C55E" : "#F59E0B",
            }}
          >
            Predictor agreement: {stats.matches}/{stats.total} ({stats.pct.toFixed(0)}%)
          </div>
          <select
            value={showOnlyMatch}
            onChange={(e) => setShowOnlyMatch(e.target.value as "all" | "match" | "miss")}
            className="rounded-md border border-border bg-secondary px-2 py-1 text-xs"
          >
            <option value="all">All rows</option>
            <option value="match">Agreements only</option>
            <option value="miss">Mismatches only</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 text-left">Formula</th>
              <th className="px-2 py-2 text-right">Al</th>
              <th className="px-2 py-2 text-right">Cr</th>
              <th className="px-2 py-2 text-right">Cu</th>
              <th className="px-2 py-2 text-right">Fe</th>
              <th className="px-2 py-2 text-right">Mn</th>
              <th className="px-2 py-2 text-right">Other</th>
              <th className="px-2 py-2 text-left">Reported</th>
              <th className="px-2 py-2 text-left">Predicted (projected)</th>
              <th className="px-2 py-2 text-right">HV</th>
              <th className="px-2 py-2 text-right">σUTS (MPa)</th>
              <th className="px-2 py-2 text-left">Source</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="data-mono">
            {filtered.map(({ r, comp, otherPct, pred, expected, match }) => (
              <tr
                key={r.formula}
                className="border-b border-border/50 hover:bg-secondary/30"
                style={{ borderLeft: `3px solid ${kindColor(expected)}` }}
              >
                <td className="px-2 py-1.5 font-sans">{r.formula}</td>
                <td className="px-2 py-1.5 text-right">{r.Al}</td>
                <td className="px-2 py-1.5 text-right">{r.Cr || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Cu || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Fe || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Mn || "—"}</td>
                <td className="px-2 py-1.5 text-right text-amber-300">
                  {otherPct > 0 ? otherPct.toFixed(1) : "—"}
                </td>
                <td className="px-2 py-1.5 font-sans" style={{ color: kindColor(expected) }}>
                  {r.phase}
                </td>
                <td className="px-2 py-1.5 font-sans" style={{ color: pred.color }}>
                  {match ? "✓ " : "✗ "}
                  {pred.label}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({pred.confidence.toFixed(0)}%)
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right">{r.HV ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.UTS ?? "—"}</td>
                <td className="px-2 py-1.5 font-sans text-muted-foreground">{r.source}</td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    onClick={() => loadExternalComp(comp, r.formula)}
                    className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20"
                    title={
                      otherPct > 0
                        ? `Loads projected Al-Cu-Fe-Mn composition (${otherPct.toFixed(1)} at% non-quaternary content omitted).`
                        : "Load this composition into the predictor."
                    }
                  >
                    Load
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        Note: the current heuristic engine is defined for the Al-Cu-Fe-Mn quaternary system. Rows
        containing Cr, V, Ti, Ce, Co, or Si are projected onto this subspace; mismatches against the
        reported phase frequently arise from those additional stabilising elements (e.g. Cr-stabilised
        i-QC) and motivate the upcoming multi-element ML extension.
      </p>
    </section>
  );
}
