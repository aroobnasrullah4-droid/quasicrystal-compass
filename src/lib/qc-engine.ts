// ============ ELEMENT DATA ============
// Hume-Rothery effective valences (Raynor scheme) used for e/a in Al-TM systems.
// Transition metals act as electron SINKS in Al-rich alloys, giving the small
// e/a values (~1.75–1.86) where icosahedral QCs are stable. Group-number
// valences would falsely give e/a ≈ 3.3 for the canonical Al₆₃Cu₂₅Fe₁₂ i-QC.
export const ELEMENTS = {
  Al: { name: "Aluminum",  valence:  3.00, vec: 3,  en: 1.61, radius: 143, color: "#94a3b8" },
  Cu: { name: "Copper",    valence:  1.00, vec: 11, en: 1.90, radius: 128, color: "#f97316" },
  Fe: { name: "Iron",      valence: -2.66, vec: 8,  en: 1.83, radius: 126, color: "#a78bfa" },
  Mn: { name: "Manganese", valence: -3.66, vec: 7,  en: 1.55, radius: 127, color: "#ec4899" },
} as const;

// Extended recognized elements (not on sliders; used by reference scorer + AI).
export const EXT_ELEMENTS = {
  Ni: { valence:  0.00, note: "Effective ~0 in Al-rich; enables Al-Ni-Fe decagonal" },
  Co: { valence: -1.71, note: "Co > 5 at% in Al-Cu-Fe-Co → decagonal QC (Kim 2002)" },
  B:  { valence:  3.00, note: "1–3 at% B refines solidification, reduces brittleness, stays i-QC" },
  Cr: { valence: -1.66, note: "Stabilizes i-QC in Al-Cu-Fe-Cr" },
  Si: { valence:  4.00, note: "Expands i-QC e/a window (Murty et al.)" },
  Ag: { valence:  1.00, note: "~1 at% Ag (substituting Cu) → antibacterial synergy with Cu/Cu₂O, stays i-QC" },
  Zn: { valence:  2.00, note: "0.5–4 at% Zn (substituting Cu) tunes e/a, boosts DIZ; QC+β retained" },
} as const;

export type ElKey = keyof typeof ELEMENTS;
export type Comp = Record<ElKey, number>;

export const RANGES: Record<ElKey, [number, number]> = {
  Al: [50, 85],
  Cu: [0, 30],
  Fe: [0, 25],
  Mn: [0, 15],
};

export interface Preset {
  label: string;
  comp: Comp;
  note: string;
}
export const PRESETS: { category: "QC" | "APPROX" | "ORDINARY"; title: string; items: Preset[] }[] = [
  {
    category: "QC",
    title: "✓ Strong QC Formers",
    items: [
      { label: "Al₆₃Cu₂₅Fe₁₂ (canonical i-QC)", comp: { Al: 63, Cu: 25, Fe: 12, Mn: 0 }, note: "Tsai — Hume-Rothery e/a ≈ 1.75" },
      { label: "Al₆₅Cu₂₀Fe₁₅ (Rosas 1998)",     comp: { Al: 65, Cu: 20, Fe: 15, Mn: 0 }, note: "Pure i-QC at 700°C/72h" },
      { label: "Ali et al. (2025) Mn-stabilized", comp: { Al: 63, Cu: 18, Fe: 12, Mn: 7 }, note: "Mn at upper edge — borderline" },
      { label: "Al₆₅Cu₂₀Fe₁₀Mn₅",                comp: { Al: 65, Cu: 20, Fe: 10, Mn: 5 }, note: "Mn-doped i-QC" },
      { label: "Al-rich i-QC",                    comp: { Al: 70, Cu: 15, Fe: 12, Mn: 3 }, note: "Al-rich variant" },
    ],
  },
  {
    category: "APPROX",
    title: "⚠ Approximant / Borderline",
    items: [
      { label: "High Mn (β-Mn risk)", comp: { Al: 63, Cu: 17, Fe: 12, Mn: 8 }, note: "Mn > 6%" },
      { label: "Low Al",              comp: { Al: 58, Cu: 22, Fe: 13, Mn: 7 }, note: "Al below threshold" },
      { label: "Cu-edge",             comp: { Al: 60, Cu: 27, Fe: 10, Mn: 3 }, note: "Cu at upper canonical edge" },
    ],
  },
  {
    category: "ORDINARY",
    title: "✗ Non-QC / Ordinary Crystal",
    items: [
      { label: "Al-excess",     comp: { Al: 80, Cu: 8,  Fe: 8,  Mn: 4 },  note: "Al far too high" },
      { label: "Al-deficient",  comp: { Al: 55, Cu: 25, Fe: 15, Mn: 5 },  note: "Al too low" },
      { label: "Fe-deficient",  comp: { Al: 65, Cu: 20, Fe: 5,  Mn: 10 }, note: "Fe low, Mn excessive" },
    ],
  },
];

// ============ CALCULATIONS ============
export function computeDescriptors(c: Comp) {
  const total = c.Al + c.Cu + c.Fe + c.Mn;
  // e/a uses Raynor effective valences (Fe, Mn negative). Hume-Rothery target
  // for Al-Cu-Fe(-Mn) icosahedral QCs: e/a ≈ 1.75–1.86.
  const e_a =
    (c.Al * ELEMENTS.Al.valence +
      c.Cu * ELEMENTS.Cu.valence +
      c.Fe * ELEMENTS.Fe.valence +
      c.Mn * ELEMENTS.Mn.valence) /
    100;
  const en = (c.Al * 1.61 + c.Cu * 1.9 + c.Fe * 1.83 + c.Mn * 1.55) / 100;
  const radius = (c.Al * 143 + c.Cu * 128 + c.Fe * 126 + c.Mn * 127) / 100;
  const vec = (c.Al * 3 + c.Cu * 11 + c.Fe * 8 + c.Mn * 7) / 100;
  const r_avg = radius;
  const delta =
    Math.sqrt(
      (c.Al / 100) * Math.pow(1 - 143 / r_avg, 2) +
        (c.Cu / 100) * Math.pow(1 - 128 / r_avg, 2) +
        (c.Fe / 100) * Math.pow(1 - 126 / r_avg, 2) +
        (c.Mn / 100) * Math.pow(1 - 127 / r_avg, 2)
    ) * 100;
  const R = 8.314;
  const xs: number[] = [c.Al, c.Cu, c.Fe, c.Mn].map((v) => v / 100).filter((x) => x > 0);
  const entropy = -R * xs.reduce((s, x) => s + x * Math.log(x), 0);
  return { e_a, en, radius, vec, total, delta, entropy };
}

export type PredKind = "QC" | "DQC" | "APPROX" | "ORDINARY" | "INVALID";
export interface Prediction {
  kind: PredKind;
  label: string;
  confidence: number;
  color: string;
  icon: string;
  reasoning: string;
  warning?: string;
}

// Optional hints from non-quaternary elements used by reference-dataset scoring.
export interface PredictHints {
  co?: number; // Co ≥ 5 at% → d-QC (Kim 2002)
  cr?: number; // Cr ≳ 8 at% → d-QC, ~3 at% → i+d coexist (Wolf 2020)
  ni?: number; // Ni > 4 at% destabilizes i-QC → B2 (Sukhova 2021)
  b?: number;  // 1–3 at% B refines i-QC; >3 at% raises porosity
  si?: number; // Si ≤ 2 at% boosts i-QC fraction; > 5 at% → approximant
  ag?: number; // ~1 at% Ag (subs Cu) → antibacterial synergy, stays i-QC
  zn?: number; // 0.5–4 at% Zn (subs Cu) → QC+β retained, antibacterial boost
  coolingRate?: number; // °C/s; >1e4 favors i-QC, suppresses β
  millingHours?: number; // MA-only (no anneal); >6 h → β/B2 dominant, no QC
  annealedAboveC?: number; // post-MA anneal temp; <500°C keeps β; ≥700°C → single-phase i-QC
  porous?: boolean; // powder-metallurgy porous compact → HV penalty (~2.2 GPa vs ~7.85 GPa cast)
}

export function predict(c: Comp, e_a: number, total: number, hints: PredictHints = {}): Prediction {
  if (total < 98 || total > 102) {
    return {
      kind: "INVALID",
      label: "Enter valid composition to predict",
      confidence: 0,
      color: "#64748B",
      icon: "⟳",
      reasoning: `Total must be 98–102%. Current total = ${total.toFixed(1)}%`,
    };
  }
  const { Al, Cu, Fe, Mn } = c;
  const co = hints.co ?? 0;
  const cr = hints.cr ?? 0;
  const ni = hints.ni ?? 0;
  const b  = hints.b  ?? 0;
  const si = hints.si ?? 0;
  const ag = hints.ag ?? 0;
  const zn = hints.zn ?? 0;

  // === Peritectic decomposition: anneal > 884°C → β-dominant, QC lost ===
  if (hints.annealedAboveC != null && hints.annealedAboveC > 884) {
    return {
      kind: "APPROX",
      label: "β-Al(Cu,Fe) (>884°C peritectic)",
      confidence: 70,
      color: "#F59E0B",
      icon: "◈",
      reasoning: `Anneal ${hints.annealedAboveC}°C exceeds Al-Cu-Fe peritectic (~884°C) → β-dominant, QC decomposes.`,
    };
  }

  // === Mechanical alloying without sufficient anneal → β/B2, NOT QC ===
  // Tcherdyntsev 2002: MA alone gives β-Al(Cu,Fe) + B2 + unreacted elements.
  // Single-phase i-QC needs post-MA anneal at ≥700°C; <500°C keeps β.
  if (hints.millingHours != null && hints.millingHours > 0) {
    const annealed = hints.annealedAboveC ?? 0;
    if (annealed < 500) {
      return {
        kind: "APPROX",
        label: "β-Al(Cu,Fe) + B2 (MA, un-annealed)",
        confidence: 60,
        color: "#F59E0B",
        icon: "◈",
        reasoning: `Mechanical alloying ${hints.millingHours} h with anneal <500°C → bcc Al(Cu,Fe) + Al₂Cu / D8.3 path stops short of i-QC (Tcherdyntsev 2002).`,
        warning: "QC only appears after annealing >500°C; single-phase needs ~700–800°C.",
      };
    }
  }

  // === Decagonal branches ===
  // Al-Cu-Fe-Cr: ≳ 8 at% Cr drives pure d-QC (Wolf et al. 2020)
  if (cr >= 8 && Al >= 60 && Al <= 72 && Cu >= 8 && Cu <= 27) {
    return {
      kind: "DQC",
      label: "Decagonal QC (Cr-stabilized)",
      confidence: 80,
      color: "#a855f7",
      icon: "❉",
      reasoning: `Cr = ${cr.toFixed(1)} at% drives i → d-QC transition in Al-Cu-Fe-Cr (Wolf 2020).`,
    };
  }
  // Al-Cu-Fe-Co: Co ≥ 5 at% (Kim 2002)
  if (co >= 5 && Al >= 60 && Al <= 72 && Cu >= 15 && Cu <= 25) {
    return {
      kind: "DQC",
      label: "Decagonal QC (Co-stabilized)",
      confidence: co >= 8 ? 85 : 65,
      color: "#a855f7",
      icon: "❉",
      reasoning: `Co = ${co.toFixed(1)} at% drives d-QC (10-fold in-plane). Pure d-QC above ~8 at% Co (Kim 2002).`,
      warning: co < 8 ? "i-QC + d-QC coexistence region (5–8 at% Co)" : undefined,
    };
  }

  // === Hard destabilizers → approximant/ordinary ===
  // Ni > 4 at% → B2 cubic phase dominates (Sukhova 2021)
  if (ni > 4) {
    return {
      kind: ni >= 9 ? "ORDINARY" : "APPROX",
      label: ni >= 9 ? "B2 cubic phase (Ni-dominated)" : "Approximant + B2 mix",
      confidence: 55,
      color: ni >= 9 ? "#EF4444" : "#F59E0B",
      icon: ni >= 9 ? "◻" : "◈",
      reasoning: `Ni = ${ni.toFixed(1)} at% exceeds 4 at% solubility — B2 cubic destabilizes i-QC (major at Ni ≈ 9).`,
    };
  }
  // Si > 5 at% (replacing Al) → approximant
  if (si > 5 && Al >= 55 && Cu >= 10 && Fe >= 10) {
    return {
      kind: "APPROX",
      label: "Approximant (Si > 5%)",
      confidence: 50,
      color: "#F59E0B",
      icon: "◈",
      reasoning: `Si = ${si.toFixed(1)} at% exceeds i-QC tolerance; periodic Si-rich approximant expected.`,
    };
  }

  // === Icosahedral i-QC band ===
  const mnOK = Mn >= 0 && Mn <= 6;
  const warnings: string[] = [];
  if (Mn > 6) warnings.push("High Mn (>6 at%) — β-Mn competing phase");
  if (b > 3)  warnings.push("B > 3 at% — raises porosity, may exit i-QC window");
  if (cr > 0 && cr < 8) warnings.push(`Cr = ${cr.toFixed(1)} at% — partial i→d transition (i+d coexist near 3%)`);
  if (ni > 0) warnings.push(`Ni = ${ni.toFixed(1)} at% dissolved (tolerated ≤4)`);
  if (ag > 0) warnings.push(`Ag = ${ag.toFixed(1)} at% (subs Cu) — antibacterial synergy via Cu/Cu₂O`);
  if (zn > 0 && zn <= 4) warnings.push(`Zn = ${zn.toFixed(1)} at% (subs Cu) — boosts DIZ; QC+β retained`);
  if (zn > 4) warnings.push(`Zn = ${zn.toFixed(1)} at% > 4 — exits validated Zn window`);
  if (hints.porous) warnings.push("Porous PM compact — hardness penalty (~2.2 GPa vs ~7.85 GPa cast)");
  const warning = warnings.length ? warnings.join(" · ") : undefined;

  if (Al >= 60 && Al <= 72 && Cu >= 10 && Cu <= 27 && Fe >= 10 && Fe <= 15 && mnOK) {
    const eaCenter = 1.805;
    const eaHalfWidth = 0.085;
    const proximity = Math.max(0, 1 - Math.abs(e_a - eaCenter) / eaHalfWidth);
    const bBonus  = b  >= 1 && b  <= 3 ? 5 : 0;
    const siBonus = si >  0 && si <= 2 ? 5 : 0;        // Si ≤ 2 at% boosts i-QC volume fraction
    const agBonus = ag > 0 && ag <= 1.5 ? 3 : 0;       // Ag ~1 at% antibacterial, no destabilization
    const znBonus = zn > 0 && zn <= 4   ? 3 : 0;       // Zn 0.5–4 at% retains QC+β
    const coolingBonus = (hints.coolingRate ?? 0) > 1e4 ? 5 : 0; // rapid solidification
    const crPenalty = cr >= 2 && cr < 8 ? -15 : 0;     // partial i→d transition
    const confidence = Math.max(20, Math.min(95, 65 + proximity * 25 + bBonus + siBonus + agBonus + znBonus + coolingBonus + crPenalty));
    const kind: PredKind = cr >= 2 && cr < 8 ? "APPROX" : "QC";
    return {
      kind,
      label: kind === "QC" ? "Icosahedral QC (i-phase)" : "i-QC + d-QC coexistence (Cr ~3%)",
      confidence,
      color: kind === "QC" ? "#22C55E" : "#F59E0B",
      icon: kind === "QC" ? "✦" : "◈",
      reasoning:
        `Inside Al-Cu-Fe(-Mn) i-QC field. e/a = ${e_a.toFixed(3)} vs Hume-Rothery 1.75–1.86.` +
        (b  >= 1 ? ` B = ${b} at% refines grains.` : "") +
        (si >= 1 ? ` Si = ${si} at% boosts i-QC fraction, cuts porosity.` : "") +
        (ag >  0 ? ` Ag = ${ag} at% adds antibacterial Cu/Cu₂O synergy.` : "") +
        (zn >  0 ? ` Zn = ${zn} at% tunes e/a; best Gram−ve DIZ at Zn=4.` : "") +
        (cr >= 2 && cr < 8 ? ` Cr = ${cr} at% triggers partial i→d coexistence.` : ""),
      warning,
    };
  }

  if (Al >= 58 && Al <= 75 && Cu >= 8 && Cu <= 28 && Fe >= 8 && Fe <= 17 && Mn >= 0 && Mn <= 9) {
    const seed = (Al * 7.3 + Cu * 3.1 + Fe * 5.7 + Mn * 11.9) % 1;
    const confidence = 35 + seed * 20;
    return {
      kind: "APPROX",
      label: "Approximant Crystal",
      confidence,
      color: "#F59E0B",
      icon: "◈",
      reasoning:
        Mn > 6
          ? "Mn > 6 at% destabilizes i-QC → periodic β-Mn approximant."
          : "Adjacent to i-QC field — periodic approximant expected.",
      warning: warning ?? "Periodic approximant structure expected",
    };
  }


  const reasons: string[] = [];
  if (Al < 60) reasons.push("Al too low (<60%)");
  if (Al > 72) reasons.push("Al too high (>72%)");
  if (Cu < 10) reasons.push("Cu insufficient (<10%)");
  if (Cu > 27) reasons.push("Cu excessive (>27%)");
  if (Fe < 10) reasons.push("Fe insufficient (<10%)");
  if (Fe > 15) reasons.push("Fe excessive (>15%)");
  if (Mn > 6)  reasons.push("Mn excessive (>6%)");
  const seed = (Al * 7.3 + Cu * 3.1 + Fe * 5.7 + Mn * 11.9) % 1;
  const confidence = 10 + seed * 20;
  return {
    kind: "ORDINARY",
    label: "Ordinary Crystal / Multi-phase",
    confidence,
    color: "#EF4444",
    icon: "◻",
    reasoning: reasons.length
      ? `Outside QC phase field: ${reasons.join(", ")}`
      : `Outside QC phase field (e/a = ${e_a.toFixed(3)})`,
    warning,
  };
}

