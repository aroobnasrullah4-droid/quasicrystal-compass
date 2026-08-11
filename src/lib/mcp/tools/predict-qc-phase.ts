import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { computeDescriptors, predict, type Comp } from "@/lib/qc-engine";

export default defineTool({
  name: "predict_qc_phase",
  title: "Predict quasicrystal phase",
  description:
    "Run the heuristic Al-Cu-Fe-Mn phase predictor on an alloy composition (at%). Returns the predicted phase class (icosahedral QC, decagonal QC, approximant, ordinary crystal), confidence, Hume-Rothery e/a ratio and other descriptors. Optional dopant and processing hints (Co, Cr, Ni, B, Si, Ag, Zn, milling hours, anneal temperature) refine the rules.",
  inputSchema: {
    Al: z.number().describe("Aluminum content in at%."),
    Cu: z.number().describe("Copper content in at%."),
    Fe: z.number().describe("Iron content in at%."),
    Mn: z.number().default(0).describe("Manganese content in at% (0 if absent)."),
    Co: z.number().optional().describe("Cobalt dopant at%; >=5 drives decagonal QC."),
    Cr: z.number().optional().describe("Chromium dopant at%; >=8 drives decagonal QC."),
    Ni: z.number().optional().describe("Nickel dopant at%; >4 destabilizes i-QC."),
    B: z.number().optional().describe("Boron dopant at%; 1-3 refines grains."),
    Si: z.number().optional().describe("Silicon dopant at%; <=2 boosts i-QC fraction."),
    Ag: z.number().optional().describe("Silver dopant at% substituting Cu."),
    Zn: z.number().optional().describe("Zinc dopant at% substituting Cu."),
    millingHours: z.number().optional().describe("Mechanical alloying time in hours."),
    annealedAboveC: z.number().optional().describe("Post-processing anneal temperature in °C."),
    coolingRate: z.number().optional().describe("Cooling rate in °C/s."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (input) => {
    const comp: Comp = { Al: input.Al, Cu: input.Cu, Fe: input.Fe, Mn: input.Mn ?? 0 };
    for (const [k, v] of Object.entries(comp)) {
      if (!Number.isFinite(v) || v < 0) throw new ToolError(`${k} must be a non-negative number.`);
    }
    const d = computeDescriptors(comp);
    const p = predict(comp, d.e_a, d.total, {
      co: input.Co,
      cr: input.Cr,
      ni: input.Ni,
      b: input.B,
      si: input.Si,
      ag: input.Ag,
      zn: input.Zn,
      millingHours: input.millingHours,
      annealedAboveC: input.annealedAboveC,
      coolingRate: input.coolingRate,
    });

    const result = {
      composition: comp,
      total_at_pct: Number(d.total.toFixed(2)),
      descriptors: {
        e_per_a: Number(d.e_a.toFixed(4)),
        electronegativity: Number(d.en.toFixed(4)),
        atomic_radius_pm: Number(d.radius.toFixed(2)),
        vec: Number(d.vec.toFixed(3)),
        delta_pct: Number(d.delta.toFixed(3)),
        config_entropy_J_molK: Number(d.entropy.toFixed(3)),
      },
      prediction: {
        kind: p.kind,
        label: p.label,
        confidence_pct: Number(p.confidence.toFixed(1)),
        reasoning: p.reasoning,
        warning: p.warning ?? null,
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
