import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOPANTS, computeEA, formulaOf, totalOf, type Entry } from "@/lib/phase-core";

export interface CompState {
  mode: "slider" | "manual";
  al: number;
  cu: number;
  fe: number;
  dopantOn: boolean;
  dopantEl: string;
  dopantAmt: number;
  manual: Entry[];
}

export const INITIAL_COMP: CompState = {
  mode: "slider",
  al: 65,
  cu: 20,
  fe: 10,
  dopantOn: true,
  dopantEl: "Mn",
  dopantAmt: 5,
  manual: [
    { el: "Al", amt: 65 },
    { el: "Cu", amt: 20 },
    { el: "Fe", amt: 15 },
  ],
};

export function entriesOf(s: CompState): Entry[] {
  if (s.mode === "manual") return s.manual.filter((e) => e.el.trim().length > 0);
  const base: Entry[] = [
    { el: "Al", amt: s.al },
    { el: "Cu", amt: s.cu },
    { el: "Fe", amt: s.fe },
  ];
  if (s.dopantOn && s.dopantAmt > 0) base.push({ el: s.dopantEl, amt: s.dopantAmt });
  return base;
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="data-mono text-sm text-primary">{value.toFixed(1)} at%</span>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={0.1}
          onValueChange={(v) => onChange(v[0])}
          className="flex-1"
        />
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={0.1}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 w-20 bg-secondary text-right data-mono text-xs"
        />
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {min}–{max}%
      </div>
    </div>
  );
}

export function CompositionInput({
  state,
  setState,
  onPredict,
  loading,
}: {
  state: CompState;
  setState: (updater: (s: CompState) => CompState) => void;
  onPredict: () => void;
  loading: boolean;
}) {
  const entries = entriesOf(state);
  const total = totalOf(entries);
  const ea = computeEA(entries);
  const off = Math.abs(total - 100) > 0.05;

  const setManual = (idx: number, patch: Partial<Entry>) =>
    setState((s) => ({
      ...s,
      manual: s.manual.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    }));

  const normalize = () =>
    setState((s) => {
      const t = totalOf(s.manual);
      if (t <= 0) return s;
      return { ...s, manual: s.manual.map((e) => ({ ...e, amt: +((e.amt / t) * 100).toFixed(2) })) };
    });

  return (
    <Panel title="Composition Input" loading={loading}>
      <Tabs
        value={state.mode}
        onValueChange={(v) => setState((s) => ({ ...s, mode: v as CompState["mode"] }))}
      >
        <TabsList className="mb-4 grid w-full grid-cols-2 bg-secondary">
          <TabsTrigger value="slider">Slider Mode</TabsTrigger>
          <TabsTrigger value="manual">Manual Mode</TabsTrigger>
        </TabsList>
      </Tabs>

      {state.mode === "slider" ? (
        <div className="space-y-4">
          <SliderRow label="Al" value={state.al} min={50} max={80} onChange={(v) => setState((s) => ({ ...s, al: v }))} />
          <SliderRow label="Cu" value={state.cu} min={5} max={35} onChange={(v) => setState((s) => ({ ...s, cu: v }))} />
          <SliderRow label="Fe" value={state.fe} min={5} max={25} onChange={(v) => setState((s) => ({ ...s, fe: v }))} />

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <span className="text-sm font-medium">Add Dopant</span>
            <Switch
              checked={state.dopantOn}
              onCheckedChange={(v) => setState((s) => ({ ...s, dopantOn: v }))}
            />
          </div>

          {state.dopantOn && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Element</label>
                <Select
                  value={state.dopantEl}
                  onValueChange={(v) => setState((s) => ({ ...s, dopantEl: v }))}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {DOPANTS.map((d, i) => (
                      <SelectItem key={`${d}-${i}`} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Amount (at%)</label>
                <Input
                  type="number"
                  min={0.1}
                  max={30}
                  step={0.1}
                  value={state.dopantAmt}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      dopantAmt: Math.max(0.1, Math.min(30, Number(e.target.value))),
                    }))
                  }
                  className="bg-secondary data-mono"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Element</th>
                  <th className="px-3 py-2 text-left font-medium">at%</th>
                  <th className="px-3 py-2 text-right font-medium">Remove</th>
                </tr>
              </thead>
              <tbody>
                {state.manual.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      <Input
                        value={row.el}
                        onChange={(e) => setManual(i, { el: e.target.value.trim() })}
                        className="h-8 w-24 bg-secondary"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step={0.1}
                        value={row.amt}
                        onChange={(e) => setManual(i, { amt: Number(e.target.value) })}
                        className="h-8 w-24 bg-secondary data-mono"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() =>
                          setState((s) => ({ ...s, manual: s.manual.filter((_, j) => j !== i) }))
                        }
                        className="rounded px-2 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${row.el}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState((s) => ({ ...s, manual: [...s.manual, { el: "", amt: 0 }] }))}
            >
              + Add Element
            </Button>
            <Button variant="outline" size="sm" onClick={normalize}>
              Normalize to 100%
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className={`data-mono font-semibold ${off ? "text-destructive" : "text-green-400"}`}>
            {total.toFixed(2)}%
          </span>
        </div>
        {off && (
          <div className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
            Total = {total.toFixed(2)}% — must equal 100%
          </div>
        )}
        <div className="data-mono rounded bg-secondary/50 px-2 py-1.5 text-sm">
          {formulaOf(entries) || "—"}
        </div>
        <div className="data-mono text-sm text-primary">e/a = {ea.toFixed(3)}</div>
        <Button className="w-full" onClick={onPredict} disabled={loading}>
          {loading ? "Predicting…" : "Predict"}
        </Button>
      </div>
    </Panel>
  );
}
