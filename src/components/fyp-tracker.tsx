import { useEffect, useMemo, useState } from "react";

type Priority = "critical" | "important" | "optional";
interface Task {
  id: string;
  text: string;
  priority: Priority;
}
interface Phase {
  id: string;
  title: string;
  weeks: string;
  color: string;
  tasks: Task[];
}

const PHASES: Phase[] = [
  {
    id: "p0",
    title: "Phase 0 — Foundation",
    weeks: "Week 1-2",
    color: "#3b82f6",
    tasks: [
      { id: "p0-1", text: "Read Sir Fahad's CNT paper (SSRN 5887591)", priority: "critical" },
      { id: "p0-2", text: "Read Liu et al. ML QC paper (10.1002/adma.202102507)", priority: "critical" },
      { id: "p0-3", text: "Read Uryu et al. 3 QCs paper (10.1103/PhysRevMaterials.7.093805)", priority: "important" },
      { id: "p0-4", text: "Download HYPOD-X dataset (figshare.com)", priority: "critical" },
      { id: "p0-5", text: "Set up Google Colab + scikit-learn", priority: "important" },
      { id: "p0-6", text: "Meet Sir Fahad — confirm scope", priority: "critical" },
      { id: "p0-7", text: "Get lab access confirmed", priority: "critical" },
    ],
  },
  {
    id: "p1",
    title: "Phase 1 — Data",
    weeks: "Week 3-5",
    color: "#a855f7",
    tasks: [
      { id: "p1-1", text: "Filter HYPOD-X for Al-based QC compositions", priority: "critical" },
      { id: "p1-2", text: "Extract CNT data from 15-20 papers manually", priority: "critical" },
      { id: "p1-3", text: "Ask Sir Fahad for raw experimental batch data", priority: "important" },
      { id: "p1-4", text: "Clean datasets — 2 CSV files ready", priority: "critical" },
      { id: "p1-5", text: "Run EDA in Colab (histograms, correlation matrix)", priority: "important" },
    ],
  },
  {
    id: "p2",
    title: "Phase 2 — ML Models",
    weeks: "Week 6-9",
    color: "#22c55e",
    tasks: [
      { id: "p2-1", text: "Train QC Phase Classifier (Random Forest)", priority: "critical" },
      { id: "p2-2", text: "Plot confusion matrix + feature importance", priority: "important" },
      { id: "p2-3", text: "Achieve >70% accuracy on test set", priority: "critical" },
      { id: "p2-4", text: "Train CNT Growth Regressor", priority: "critical" },
      { id: "p2-5", text: "Cross-validate (k=5)", priority: "important" },
      { id: "p2-6", text: "Select 3 compositions for lab validation from model", priority: "critical" },
    ],
  },
  {
    id: "p3",
    title: "Phase 3 — Experiments",
    weeks: "Week 10-13",
    color: "#f97316",
    tasks: [
      { id: "p3-1", text: "Fabricate Composition 1 (model-predicted strong QC)", priority: "critical" },
      { id: "p3-2", text: "Fabricate Composition 2 (novel prediction)", priority: "critical" },
      { id: "p3-3", text: "Fabricate Composition 3 (control — Sir Fahad's known)", priority: "important" },
      { id: "p3-4", text: "XRD characterization", priority: "critical" },
      { id: "p3-5", text: "SEM/TEM imaging", priority: "critical" },
      { id: "p3-6", text: "DIZ antibacterial test", priority: "critical" },
      { id: "p3-7", text: "Compare predictions vs experiment", priority: "critical" },
    ],
  },
  {
    id: "p4",
    title: "Phase 4 — Writing",
    weeks: "Week 14-16",
    color: "#ef4444",
    tasks: [
      { id: "p4-1", text: "Results analysis + comparison tables", priority: "critical" },
      { id: "p4-2", text: "FYP thesis draft", priority: "critical" },
      { id: "p4-3", text: "Journal paper draft (target: Mat. Today Comm.)", priority: "important" },
      { id: "p4-4", text: "Submit to Sir Fahad for review", priority: "critical" },
      { id: "p4-5", text: "FYP presentation preparation", priority: "critical" },
    ],
  },
];

const PRIORITY_LABEL: Record<Priority, { c: string; e: string }> = {
  critical: { c: "#ef4444", e: "🔴" },
  important: { c: "#f59e0b", e: "🟡" },
  optional: { c: "#22c55e", e: "🟢" },
};

const STORAGE_KEY = "qc.fyp.tasks.v1";

export function FYPTracker() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [expandedPhase, setExpandedPhase] = useState<string | null>("p0");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {
      /* ignore */
    }
  }, [done]);

  const stats = useMemo(() => {
    const all = PHASES.flatMap((p) => p.tasks);
    const total = all.length;
    const completed = all.filter((t) => done[t.id]).length;
    // Current phase = first phase that has incomplete tasks
    const currentPhase = PHASES.find((p) => p.tasks.some((t) => !done[t.id])) ?? PHASES[PHASES.length - 1];
    const nextCritical = all.find((t) => !done[t.id] && t.priority === "critical");
    return { total, completed, currentPhase, nextCritical };
  }, [done]);

  const toggle = (id: string) => setDone((s) => ({ ...s, [id]: !s[id] }));

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold">🗓 FYP Progress Tracker</h2>
          <p className="text-xs text-muted-foreground">
            16-week ML + Experimental roadmap — PIEAS MME 2025-26
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="font-mono text-sky-300">
              {stats.completed}/{stats.total}
            </div>
            <div className="text-muted-foreground">tasks</div>
          </div>
          <span className="text-muted-foreground">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 px-5 pb-5">
          {/* Timeline */}
          <div className="flex gap-1 overflow-hidden rounded">
            {PHASES.map((p) => {
              const phaseDone = p.tasks.filter((t) => done[t.id]).length;
              const pct = (phaseDone / p.tasks.length) * 100;
              return (
                <button
                  key={p.id}
                  onClick={() => setExpandedPhase(expandedPhase === p.id ? null : p.id)}
                  className="relative flex-1 rounded border border-border bg-background/40 px-2 py-2 text-left hover:bg-muted/40"
                  style={{ borderTopColor: p.color, borderTopWidth: 3 }}
                >
                  <div className="text-[10px] font-semibold" style={{ color: p.color }}>
                    {p.weeks}
                  </div>
                  <div className="truncate text-xs">{p.title.replace(/^Phase \d+ — /, "")}</div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded bg-muted">
                    <div className="h-full" style={{ width: `${pct}%`, background: p.color }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expanded phase tasks */}
          {PHASES.filter((p) => p.id === expandedPhase).map((p) => (
            <div key={p.id} className="rounded border border-border bg-background/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 text-xs font-semibold"
                  style={{ background: `${p.color}22`, color: p.color }}
                >
                  {p.title}
                </span>
                <span className="text-xs text-muted-foreground">{p.weeks}</span>
              </div>
              <ul className="space-y-1.5">
                {p.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!done[t.id]}
                      onChange={() => toggle(t.id)}
                      className="mt-0.5 h-4 w-4 accent-sky-400"
                    />
                    <span className={done[t.id] ? "text-muted-foreground line-through" : ""}>
                      {t.text}
                    </span>
                    <span
                      className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px]"
                      style={{
                        background: `${PRIORITY_LABEL[t.priority].c}22`,
                        color: PRIORITY_LABEL[t.priority].c,
                      }}
                    >
                      {PRIORITY_LABEL[t.priority].e} {t.priority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Bottom stats */}
          <div className="rounded border border-sky-500/30 bg-sky-500/5 p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span>Progress</span>
              <span className="font-mono text-sky-300">
                {stats.completed}/{stats.total} complete (
                {Math.round((stats.completed / stats.total) * 100)}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-500"
                style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Current Phase: </span>
              <span style={{ color: stats.currentPhase.color }}>{stats.currentPhase.title}</span>
            </div>
            {stats.nextCritical && (
              <div className="text-xs">
                <span className="text-muted-foreground">Next critical action: </span>
                <span className="text-foreground">{stats.nextCritical.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
