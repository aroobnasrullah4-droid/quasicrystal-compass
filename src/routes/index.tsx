import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CompositionInput,
  INITIAL_COMP,
  entriesOf,
  type CompState,
} from "@/components/composition-input";
import { PhasePrediction } from "@/components/phase-prediction";
import { EAAnalysis } from "@/components/ea-analysis";
import { StructureViewer } from "@/components/structure-viewer";
import { XRDCard } from "@/components/xrd-card";
import { PMRoute } from "@/components/pm-route";
import {
  computeEA,
  derivePhaseDistribution,
  dominantPhase,
  formulaOf,
  totalOf,
  type Dist,
  type PMInput,
} from "@/lib/phase-core";

const SITE_URL = "https://quasicrystal-compass.lovable.app";
const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3b3ec96a-ba1e-4026-a2a3-934c87da9989/id-preview-94c0b2dc--ac6a93a3-21bd-4432-87b2-dc387c95ffab.lovable.app-1781500272820.png";
const PAGE_TITLE = "QC Phase Predictor — Al-Cu-Fe Quasicrystal Tool";
const PAGE_DESC =
  "Predict quasicrystalline phase formation in Al-Cu-Fe alloys: ML phase prediction, Hume-Rothery e/a analysis, cluster structure, simulated XRD and powder-metallurgy sintering guidance.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "QC Phase Predictor",
          applicationCategory: "ResearchApplication",
          operatingSystem: "Web browser",
          url: SITE_URL + "/",
          description: PAGE_DESC,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: QCPredictor,
});

const API_URL = "https://aroobmunaam-qc-phase-predictor.hf.space/predict";

const PRESSURE_LABEL: Record<number, string> = {
  200: "Low (200MPa)",
  400: "Medium (400MPa)",
  600: "High (600MPa)",
};

interface MLResult {
  qc_probability: number;
  prediction?: string;
  predicted_phase?: string;
  e_per_a?: number;
}

interface HistoryRow {
  id: number;
  formula: string;
  ea: number;
  phase: string;
  confidence: number;
  ts: string;
}

function QCPredictor() {
  const [comp, setComp] = useState<CompState>(INITIAL_COMP);
  const [pm, setPm] = useState<PMInput>({
    temp: 750,
    time: 2,
    pressure: 400,
    atmosphere: "Argon",
  });
  const [ml, setMl] = useState<MLResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const nextId = useRef(1);

  const entries = useMemo(() => entriesOf(comp), [comp]);
  const ea = useMemo(() => computeEA(entries), [entries]);
  const baseEa = useMemo(
    () => computeEA(entries.filter((e) => ["Al", "Cu", "Fe"].includes(e.el))),
    [entries]
  );
  const dopant = useMemo(() => entries.find((e) => !["Al", "Cu", "Fe"].includes(e.el)) ?? null, [entries]);

  const dist: Dist | null = useMemo(() => {
    if (!ml) return null;
    return derivePhaseDistribution(ml.qc_probability, ea, entries);
  }, [ml, ea, entries]);
  const dominant = dist ? dominantPhase(dist) : null;

  const runPredict = useCallback(() => {
    const list = entriesOf(comp);
    if (totalOf(list) <= 0) return;
    const composition: Record<string, number> = {};
    list.forEach((e) => {
      if (e.el) composition[e.el] = Number(e.amt);
    });
    setLoading(true);
    setError(null);
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        composition,
        pm_conditions: {
          sintering_temp: pm.temp,
          sintering_time: pm.time,
          pressure: PRESSURE_LABEL[pm.pressure],
          atmosphere: pm.atmosphere,
        },
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((d: MLResult) => {
        setMl(d);
        const localEa = computeEA(list);
        const dd = derivePhaseDistribution(d.qc_probability, localEa, list);
        const dom = dominantPhase(dd);
        setHistory((h) =>
          [
            {
              id: nextId.current++,
              formula: formulaOf(list),
              ea: localEa,
              phase: dom,
              confidence: Math.max(0, Math.min(1, d.qc_probability)) * 100,
              ts: new Date().toLocaleTimeString(),
            },
            ...h,
          ].slice(0, 20)
        );
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  }, [comp, pm]);

  // Auto-run on composition / PM change (800ms debounce)
  useEffect(() => {
    const t = setTimeout(runPredict, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp, pm]);

  const confidence = ml ? Math.max(0, Math.min(1, ml.qc_probability)) * 100 : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="penrose-bg border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polygon points="12,2 14.6,9.5 22,9.5 16,14 18.5,21.5 12,17 5.5,21.5 8,14 2,9.5 9.4,9.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">QC Phase Predictor</h1>
                <p className="text-sm text-muted-foreground">
                  Computational Tool for Quasicrystalline Phase Prediction in Al-Cu-Fe Systems
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-mono text-sky-300">
                v3.0 | ML LIVE
              </span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border bg-secondary hover:bg-secondary/80">
                    About
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg border-border bg-card">
                  <DialogHeader>
                    <DialogTitle>QC Phase Predictor v3.0</DialogTitle>
                    <DialogDescription className="space-y-3 pt-2 text-sm text-muted-foreground">
                      <span className="block">
                        A research tool for predicting quasicrystalline phase formation in
                        Al-Cu-Fe based alloys, powered by the HYPOD-X machine-learning model.
                      </span>
                      <span className="block">
                        <strong className="text-foreground">Scientific basis:</strong> Hume-Rothery
                        electron concentration (Raynor valences), Tsai QC formation criteria, and
                        published Al-Cu-Fe reference diffraction patterns.
                      </span>
                      <span className="block italic">
                        Predictions are computational estimates and require experimental validation
                        by XRD, SEM/EDX and DTA.
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CompositionInput state={comp} setState={setComp} onPredict={runPredict} loading={loading} />
          <PhasePrediction
            dist={dist}
            confidence={confidence}
            loading={loading}
            error={error}
            dopant={dopant}
            mlLabel={ml?.predicted_phase ?? ml?.prediction ?? null}
          />
          <EAAnalysis ea={ea} baseEa={baseEa} dopant={dopant} loading={loading} />
          <StructureViewer
            entries={entries}
            dominant={dominant}
            dist={dist}
            dopant={dopant}
            loading={loading}
          />
          <XRDCard dominant={dominant} loading={loading} />
          <PMRoute pm={pm} setPm={setPm} ea={ea} loading={loading} />
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Session History ({history.length})
            </h2>
            {history.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setHistory([])}>
                Clear
              </Button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Predictions run automatically as you change the composition — results appear here.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Composition</th>
                    <th className="px-3 py-2 text-left font-medium">e/a</th>
                    <th className="px-3 py-2 text-left font-medium">Phase</th>
                    <th className="px-3 py-2 text-left font-medium">QC prob.</th>
                    <th className="px-3 py-2 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">{r.id}</td>
                      <td className="data-mono px-3 py-1.5">{r.formula}</td>
                      <td className="data-mono px-3 py-1.5">{r.ea.toFixed(3)}</td>
                      <td className="px-3 py-1.5">{r.phase}</td>
                      <td className="data-mono px-3 py-1.5">{r.confidence.toFixed(1)}%</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.ts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          QC Phase Predictor v3.0 — HYPOD-X ML model. Computational estimates for research
          guidance; validate experimentally.
        </footer>
      </main>
    </div>
  );
}
