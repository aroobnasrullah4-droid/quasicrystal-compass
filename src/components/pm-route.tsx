import { Panel } from "@/components/panel";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PM_TONE, pmDensity, pmOutcome, type PMInput } from "@/lib/phase-core";

export function PMRoute({
  pm,
  setPm,
  ea,
  loading,
}: {
  pm: PMInput;
  setPm: (updater: (p: PMInput) => PMInput) => void;
  ea: number;
  loading: boolean;
}) {
  const outcome = pmOutcome(pm, ea);
  const density = pmDensity(pm.pressure);

  return (
    <Panel title="Powder Metallurgy Route" subtitle="Sintering conditions" loading={loading}>
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-medium">Sintering Temperature</span>
            <span className="data-mono text-sm text-primary">{pm.temp} °C</span>
          </div>
          <Slider
            value={[pm.temp]}
            min={400}
            max={1000}
            step={10}
            onValueChange={(v) => setPm((p) => ({ ...p, temp: v[0] }))}
          />
          <div className="mt-0.5 text-[10px] text-muted-foreground">400–1000 °C</div>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-medium">Sintering Time</span>
            <span className="data-mono text-sm text-primary">{pm.time} h</span>
          </div>
          <Slider
            value={[pm.time]}
            min={0.5}
            max={12}
            step={0.5}
            onValueChange={(v) => setPm((p) => ({ ...p, time: v[0] }))}
          />
          <div className="mt-0.5 text-[10px] text-muted-foreground">0.5–12 h</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Compaction Pressure</label>
            <Select
              value={String(pm.pressure)}
              onValueChange={(v) => setPm((p) => ({ ...p, pressure: Number(v) as PMInput["pressure"] }))}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="200">Low (200 MPa)</SelectItem>
                <SelectItem value="400">Medium (400 MPa)</SelectItem>
                <SelectItem value="600">High (600 MPa)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Atmosphere</label>
            <Select
              value={pm.atmosphere}
              onValueChange={(v) => setPm((p) => ({ ...p, atmosphere: v as PMInput["atmosphere"] }))}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Argon">Argon</SelectItem>
                <SelectItem value="Vacuum">Vacuum</SelectItem>
                <SelectItem value="Air">Air</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${PM_TONE[outcome.tone]}`}>
        {outcome.text}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <div className="text-muted-foreground">Expected phase</div>
          <div className="mt-0.5 font-semibold">{outcome.phase}</div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <div className="text-muted-foreground">Green density</div>
          <div className="mt-0.5 font-semibold">{density.range}</div>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${density.mid}%` }}
        />
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Optimal i-QC window: 650–850 °C under Argon or vacuum with e/a in 1.75–1.86.
      </p>
    </Panel>
  );
}
