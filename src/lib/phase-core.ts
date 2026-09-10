// ============================================================
// Shared domain core for the QC Phase Predictor workspace
// ============================================================

export interface Entry {
  el: string;
  amt: number;
}

// Hume-Rothery effective (Raynor) valences. Transition metals act as
// electron sinks in Al-rich alloys, giving e/a ~1.75-1.86 for i-QC.
export const VALENCE: Record<string, number> = {
  Al: 3, Cu: 1, Fe: -2.66, Mn: -3.66, Si: 4, B: 3, Ag: 1, Zn: 2,
  Cr: -1.66, Co: -1.71, Ni: 0, V: -3.66, Ti: -2.66, Mo: -4.66,
  W: -4.66, Nb: -3.66, Zr: -2.66, Pd: 0, Pt: 0, Ge: 4, Ga: 3,
  Sn: 4, Y: 3, Sc: 3, Re: -5, Ru: -2, Au: 1, Ce: 3, La: 3,
  Nd: 3, Hf: -2.66, Ta: -3.66,
};

export const DOPANTS = [
  "Mn", "Si", "B", "Ag", "Zn", "Cr", "Co", "Ni", "V", "Ti", "Mo",
  "W", "Nb", "Zr", "Pd", "Pt", "Ge", "Ga", "Sn", "Y", "Sc", "Re",
  "Ru", "Au", "Ce", "La", "Nd", "Hf", "Ta", "Cu",
];

export const ATOM_COLORS: Record<string, string> = {
  Al: "#94a3b8",
  Cu: "#f97316",
  Fe: "#a16207",
};

export const DOPANT_COLORS: Record<string, string> = {
  Mn: "#a855f7", Si: "#3b82f6", B: "#f43f5e", Ag: "#e2e8f0",
  Zn: "#7dd3fc", Cr: "#15803d", Co: "#ec4899", Ni: "#22d3ee",
  Ti: "#facc15",
};

export function dopantColor(el: string) {
  return DOPANT_COLORS[el] ?? "#c084fc";
}

export function computeEA(entries: Entry[]): number {
  const total = entries.reduce((s, e) => s + (e.amt || 0), 0);
  if (total <= 0) return 0;
  const sum = entries.reduce((s, e) => s + (e.amt || 0) * (VALENCE[e.el] ?? 3), 0);
  return sum / total;
}

export function totalOf(entries: Entry[]) {
  return entries.reduce((s, e) => s + (e.amt || 0), 0);
}

export function formulaOf(entries: Entry[]) {
  return entries
    .filter((e) => e.amt > 0)
    .map((e) => `${e.el}${+e.amt.toFixed(2)}`)
    .join(" ");
}

// ============ Dopant literature notes ============
export function dopantNote(el: string, amt: number): { text: string; tone: "good" | "warn" | "info" } {
  switch (el) {
    case "Mn":
      if (amt >= 2 && amt <= 7) return { text: "Mn 2–7%: Stabilizes i-QC ✓", tone: "good" };
      if (amt > 7) return { text: "Mn >7%: ⚠ β-Mn approximant risk", tone: "warn" };
      break;
    case "Si":
      if (amt >= 1 && amt <= 2) return { text: "Si 1–2%: Increases QC fraction ✓", tone: "good" };
      if (amt > 5) return { text: "Si >5%: ⚠ Approximant likely", tone: "warn" };
      break;
    case "B":
      if (amt >= 1 && amt <= 3) return { text: "B 1–3%: Grain refinement ✓", tone: "good" };
      if (amt > 3) return { text: "B >3%: ⚠ Porosity risk in PM", tone: "warn" };
      break;
    case "Ag":
      if (amt >= 0.5 && amt <= 2) return { text: "Ag 0.5–2%: Neutral — antibacterial ✓", tone: "good" };
      break;
    case "Zn":
      if (amt >= 1 && amt <= 4) return { text: "Zn 1–4%: Tunes e/a ✓", tone: "good" };
      break;
    case "Cr":
      if (amt >= 3 && amt <= 8) return { text: "Cr 3–8%: i-QC → d-QC transition", tone: "info" };
      break;
    case "Co":
      if (amt < 5) return { text: "Co <5%: Favors d-QC", tone: "info" };
      break;
    case "Ni":
      if (amt >= 1 && amt <= 5) return { text: "Ni 1–5%: Fe substitution, QC retained", tone: "info" };
      break;
    case "Ti":
      if (amt >= 1 && amt <= 3) return { text: "Ti 1–3%: Lattice strengthening", tone: "info" };
      break;
  }
  return { text: "Limited literature data — verify experimentally", tone: "info" };
}

export function dopantSite(el: string): { text: string; site: "Fe" | "Al" | "Cu" | "interstitial" | "unknown" } {
  switch (el) {
    case "Mn": return { text: "Substitutes Fe site in icosahedral shell", site: "Fe" };
    case "Cr": return { text: "Substitutes Fe site", site: "Fe" };
    case "Si": return { text: "Substitutes Al site, modifies cluster", site: "Al" };
    case "B": return { text: "Goes to grain boundary / interstitial", site: "interstitial" };
    case "Ag": return { text: "Substitutes Cu site", site: "Cu" };
    case "Zn": return { text: "Substitutes Cu site", site: "Cu" };
    default: return { text: "Likely substitutes largest atom site — position uncertain", site: "unknown" };
  }
}

// ============ Phase model ============
export type PhaseKey = "IQC" | "DQC" | "IAC" | "BETA" | "LAMBDA" | "THETA";

export const PHASES: { key: PhaseKey; label: string; color: string }[] = [
  { key: "IQC", label: "Icosahedral QC (IQC)", color: "#22c55e" },
  { key: "DQC", label: "Decagonal QC (DQC)", color: "#14b8a6" },
  { key: "IAC", label: "Approximant (IAC)", color: "#eab308" },
  { key: "BETA", label: "β-AlCuFe", color: "#f97316" },
  { key: "LAMBDA", label: "λ-Al13Fe4", color: "#ef4444" },
  { key: "THETA", label: "θ-Al2Cu", color: "#991b1b" },
];

export type Dist = Record<PhaseKey, number>;

export function derivePhaseDistribution(
  qcProbability: number,
  ea: number,
  entries: Entry[]
): Dist {
  const amt = (el: string) => entries.find((e) => e.el === el)?.amt ?? 0;
  const qc = Math.max(0, Math.min(1, qcProbability)) * 100;
  const rest = 100 - qc;

  // Split QC share between icosahedral and decagonal
  const dFactor = amt("Cr") >= 3 || amt("Co") >= 3 ? 0.62 : amt("Co") > 0 || amt("Cr") > 0 ? 0.3 : 0.1;
  const dqc = qc * dFactor;
  const iqc = qc - dqc;

  // Split non-QC share by e/a regime
  let w: [number, number, number, number]; // IAC, BETA, LAMBDA, THETA
  if (ea < 1.7) w = [0.15, 0.35, 0.05, 0.45];
  else if (ea < 1.75) w = [0.5, 0.28, 0.07, 0.15];
  else if (ea <= 1.86) w = [0.45, 0.27, 0.15, 0.13];
  else if (ea <= 1.92) w = [0.5, 0.2, 0.2, 0.1];
  else w = [0.2, 0.15, 0.55, 0.1];

  const dist: Dist = {
    IQC: iqc,
    DQC: dqc,
    IAC: rest * w[0],
    BETA: rest * w[1],
    LAMBDA: rest * w[2],
    THETA: rest * w[3],
  };
  const sum = (Object.values(dist) as number[]).reduce((a, b) => a + b, 0) || 1;
  (Object.keys(dist) as PhaseKey[]).forEach((k) => (dist[k] = (dist[k] / sum) * 100));
  return dist;
}

export function dominantPhase(dist: Dist): PhaseKey {
  return (Object.keys(dist) as PhaseKey[]).reduce((a, b) => (dist[b] > dist[a] ? b : a), "IQC");
}

export function verdictFor(dominant: PhaseKey, dist: Dist) {
  const mixed = dist[dominant] < 45;
  if (mixed && dominant !== "IQC")
    return { text: "⚠ MIXED PHASES — check e/a", cls: "border-orange-500/40 bg-orange-500/10 text-orange-300" };
  switch (dominant) {
    case "IQC":
      return { text: "✓ IQC CONFIRMED — synthesize", cls: "border-green-500/40 bg-green-500/10 text-green-300" };
    case "DQC":
      return { text: "◈ DECAGONAL QC — adjust Mn/Cr", cls: "border-teal-500/40 bg-teal-500/10 text-teal-300" };
    case "IAC":
      return { text: "⚠ APPROXIMANT — near boundary", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" };
    case "BETA":
      return { text: "⚠ MIXED PHASES — check e/a", cls: "border-orange-500/40 bg-orange-500/10 text-orange-300" };
    default:
      return { text: "✗ NON-QC — change composition", cls: "border-red-500/40 bg-red-500/10 text-red-300" };
  }
}

// ============ e/a reference table ============
export const EA_TABLE = [
  { range: "< 1.70", phase: "θ-Al2Cu or β-phase" },
  { range: "1.70 – 1.75", phase: "IAC (approximant)" },
  { range: "1.75 – 1.86", phase: "IQC or DQC ✓" },
  { range: "1.86 – 1.92", phase: "IAC or mixed" },
  { range: "> 1.92", phase: "λ-Al13Fe4" },
];

export function eaExpectedPhase(ea: number) {
  if (ea < 1.7) return "θ-Al2Cu or β-phase";
  if (ea < 1.75) return "IAC (approximant)";
  if (ea <= 1.86) return "IQC or DQC";
  if (ea <= 1.92) return "IAC or mixed";
  return "λ-Al13Fe4";
}

// ============ XRD reference patterns ============
export interface XPeak { pos: number; int: number; hkl?: string }
export interface XPattern { key: PhaseKey; label: string; source: string; color: string; peaks: XPeak[] }

export const XRD_PATTERNS: Record<PhaseKey, XPattern> = {
  IQC: {
    key: "IQC", label: "IQC", color: "#22c55e",
    source: "Tsai et al. 1987 — Al63Cu25Fe12",
    peaks: [
      { pos: 23.5, int: 45 }, { pos: 27.2, int: 100, hkl: "(100000)" },
      { pos: 31.4, int: 60 }, { pos: 38.6, int: 55, hkl: "(101000)" },
      { pos: 42.1, int: 80, hkl: "(110000)" }, { pos: 45.3, int: 35 },
      { pos: 49.8, int: 50 }, { pos: 54.2, int: 40 }, { pos: 58.7, int: 30 },
      { pos: 63.1, int: 45 }, { pos: 67.4, int: 25 }, { pos: 72.0, int: 35 },
    ],
  },
  DQC: {
    key: "DQC", label: "DQC", color: "#14b8a6",
    source: "Bendersky 1985",
    peaks: [
      { pos: 22.1, int: 40 }, { pos: 24.8, int: 70 }, { pos: 34.2, int: 100 },
      { pos: 40.3, int: 55 }, { pos: 44.5, int: 80 }, { pos: 48.3, int: 45 },
      { pos: 53.1, int: 35 }, { pos: 62.4, int: 30 },
    ],
  },
  IAC: {
    key: "IAC", label: "IAC", color: "#eab308",
    source: "Dong et al. 1991",
    peaks: [
      { pos: 23.8, int: 40 }, { pos: 27.5, int: 100 }, { pos: 31.7, int: 55 },
      { pos: 38.9, int: 50 }, { pos: 42.4, int: 75 }, { pos: 45.6, int: 30 },
    ],
  },
  BETA: {
    key: "BETA", label: "β-AlCuFe", color: "#f97316",
    source: "JCPDS 045-1287",
    peaks: [
      { pos: 29.3, int: 60, hkl: "(110)" }, { pos: 41.8, int: 100, hkl: "(200)" },
      { pos: 51.3, int: 55, hkl: "(211)" }, { pos: 59.6, int: 45, hkl: "(220)" },
      { pos: 67.1, int: 40, hkl: "(310)" },
    ],
  },
  LAMBDA: {
    key: "LAMBDA", label: "λ-Al13Fe4", color: "#ef4444",
    source: "JCPDS 001-1008",
    peaks: [
      { pos: 21.8, int: 50 }, { pos: 31.2, int: 100 }, { pos: 44.7, int: 70 },
      { pos: 55.3, int: 40 },
    ],
  },
  THETA: {
    key: "THETA", label: "θ-Al2Cu", color: "#991b1b",
    source: "JCPDS 025-0012",
    peaks: [
      { pos: 37.8, int: 55 }, { pos: 39.2, int: 100 }, { pos: 42.8, int: 65 },
      { pos: 46.1, int: 40 },
    ],
  },
};

// ============ Powder metallurgy route ============
export interface PMInput {
  temp: number;
  time: number;
  pressure: 200 | 400 | 600;
  atmosphere: "Argon" | "Vacuum" | "Air";
}

export function pmDensity(pressure: number) {
  if (pressure === 200) return { range: "70–80% theoretical density", mid: 75 };
  if (pressure === 400) return { range: "85–92% theoretical density", mid: 88 };
  return { range: "93–98% theoretical density", mid: 95 };
}

export function pmOutcome(pm: PMInput, ea: number) {
  const eaOK = ea >= 1.75 && ea <= 1.86;
  if (pm.temp < 500)
    return { text: "Insufficient. CRY dominant.", tone: "red" as const, phase: "Crystalline (CRY)" };
  if (pm.temp < 650)
    return { text: "Partial QC. Mixed β + QC.", tone: "orange" as const, phase: "β + QC mixed" };
  if (pm.temp <= 850) {
    if (pm.atmosphere === "Air")
      return { text: "⚠ Oxidation risk. Switch to Argon.", tone: "yellow" as const, phase: "QC + oxide scale" };
    if (eaOK)
      return { text: "✓ Optimal. IQC expected.", tone: "green" as const, phase: "IQC" };
    return {
      text: `⚠ Sintering window OK but e/a = ${ea.toFixed(3)} is outside 1.75–1.86.`,
      tone: "yellow" as const,
      phase: eaExpectedPhase(ea),
    };
  }
  return { text: "Oversintering. β-phase decomposition.", tone: "red" as const, phase: "β-AlCuFe" };
}

export const PM_TONE: Record<string, string> = {
  green: "border-green-500/40 bg-green-500/10 text-green-300",
  yellow: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  orange: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  red: "border-red-500/40 bg-red-500/10 text-red-300",
};
