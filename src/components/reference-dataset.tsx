import { useMemo, useState } from "react";

type Comp = { Al: number; Cu: number; Fe: number; Mn: number };
type Kind = "QC" | "DQC" | "APPROX" | "ORDINARY";

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
  Ni?: number;
  B?: number;
  Si?: number;
  Ag?: number;
  Zn?: number;
  coolingRate?: number; // °C/s
  millingHours?: number;
  annealedAboveC?: number;
  porous?: boolean;
  phase: string;
  HV: number | null;
  UTS: number | null;
  source: string;
  temp_C?: number;
  time_h?: number;
  anneal_temp?: number;
  anneal_h?: number;
  mill_h?: number;
  i_phase_pct?: number;
  wear_rate?: number;
  friction?: number;
  note?: string;
  E_GPa?: number;
  K_IC_MPa_m?: number;
  resistivity_uOhm_cm?: number;
  grain_softening_nm?: number;
  leaching_agent?: string;
  application?: string;
  active_sites?: string;
  DIZ_mm?: number;
  HV_GPa?: number;
  grain_size_nm?: number;
  selectivity?: string;
  system?: string; // e.g. "Al-Pd-Mn (i)" — non-Al-Cu-Fe-(Mn) QC system, forced out-of-scope
}


// Literature dataset
const DATA: RawRow[] = [
  // Inoue 2003 / Shaitura 2007
  { formula: "Al84.6Cr15.4",            Al: 84.6, Cr: 15.4, Cu: 0,  Fe: 0,    Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "QC",     HV: 710, UTS: null,  source: "Inoue 2003" },
  { formula: "Al94.5Cr3Ce1Co1.5",       Al: 94.5, Cr: 3,    Cu: 0,  Fe: 0,    Mn: 0, V: 0, Ti: 0, Ce: 1, Co: 1.5, phase: "QC+Al",  HV: null, UTS: 1340, source: "Inoue 2003" },
  { formula: "Al94V4Fe2",               Al: 94,   Cr: 0,    Cu: 0,  Fe: 2,    Mn: 0, V: 4, Ti: 0, Ce: 0, Co: 0,   phase: "Am+Al",  HV: null, UTS: 1390, source: "Inoue 2003" },
  { formula: "Al93Ti4Fe3",              Al: 93,   Cr: 0,    Cu: 0,  Fe: 3,    Mn: 0, V: 0, Ti: 4, Ce: 0, Co: 0,   phase: "Am+Al",  HV: 450, UTS: 1320, source: "Inoue 2003" },
  { formula: "Al93Fe3Cr2Ti2",           Al: 93,   Cr: 2,    Cu: 0,  Fe: 3,    Mn: 0, V: 0, Ti: 2, Ce: 0, Co: 0,   phase: "QC+Al",  HV: 192, UTS: 658,  source: "Inoue 2003" },
  { formula: "Al65Cu20Fe15",            Al: 65,   Cr: 0,    Cu: 20, Fe: 15,   Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "i-QC",   HV: 520, UTS: null, source: "Shaitura 2007" },
  { formula: "Al64Cu18Fe8Cr8",          Al: 64,   Cr: 8,    Cu: 18, Fe: 8,    Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "i-QC",   HV: 550, UTS: null, source: "Shaitura 2007" },
  { formula: "Al67Cu9Fe10.5Cr10.5Si3",  Al: 67,   Cr: 10.5, Cu: 9,  Fe: 10.5, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,   phase: "i-QC",   HV: 700, UTS: null, source: "Shaitura 2007" },

  // Rosas & Perez 1998 — Al-Cu-Fe heat treatment
  { formula: "Al65Cu20Fe15 (700°C/72h)", Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: null, UTS: null, source: "Rosas 1998", temp_C: 700, time_h: 72, note: "Pure i-QC anneal" },
  { formula: "Al65Cu20Fe15 (900°C/8h)",  Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "β",    HV: null, UTS: null, source: "Rosas 1998", temp_C: 900, time_h: 8, note: ">884°C peritectic → β" },
  { formula: "Al65Cu20Fe15 (850°C/24h)", Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "QC+β", HV: null, UTS: null, source: "Rosas 1998", temp_C: 850, time_h: 24 },
  { formula: "Al60Cu25Fe15 (700°C/72h)", Al: 60, Cr: 0, Cu: 25, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: null, UTS: null, source: "Rosas 1998", temp_C: 700, time_h: 72 },

  // Kim 2002 — Co substitution → decagonal
  { formula: "Al65Cu20Fe15",             Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC",      HV: null, UTS: null, source: "Kim 2002" },
  { formula: "Al65Cu20Fe12Co3",          Al: 65, Cr: 0, Cu: 20, Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 3, phase: "i-QC+B2",   HV: null, UTS: null, source: "Kim 2002" },
  { formula: "Al65Cu20Fe10Co5",          Al: 65, Cr: 0, Cu: 20, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 5, phase: "i-QC+d-QC", HV: null, UTS: null, source: "Kim 2002" },
  { formula: "Al65Cu20Fe7Co8",           Al: 65, Cr: 0, Cu: 20, Fe: 7,  Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 8, phase: "d-QC",      HV: null, UTS: null, source: "Kim 2002" },

  // Lee 2020 — annealing at 600°C
  { formula: "Al57Cu33Fe10 (600°C/0h)",  Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 712, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 0,  i_phase_pct: 59.24, wear_rate: 2.21e-4, friction: 0.363 },
  { formula: "Al57Cu33Fe10 (600°C/12h)", Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 736, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 12, i_phase_pct: 68.85, wear_rate: 1.16e-4, friction: 0.331 },
  { formula: "Al57Cu33Fe10 (600°C/24h)", Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 750, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 24, i_phase_pct: 75.84, wear_rate: 1.05e-4, friction: 0.304 },
  { formula: "Al57Cu33Fe10 (600°C/36h)", Al: 57, Cr: 0, Cu: 33, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 763, UTS: null, source: "Lee 2020", anneal_temp: 600, anneal_h: 36, i_phase_pct: 81.75, wear_rate: 0.50e-4, friction: 0.252 },

  // Mukhopadhyay & Yadav 2022 review + cited works
  { formula: "Al63Cu24Fe13 (icosahedrite)", Al: 63,   Cr: 0, Cu: 24, Fe: 13,   Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC",              HV: null, UTS: null, source: "Bindi 2009",                note: "Natural mineral" },
  { formula: "Al62.5Cu25Fe12.5 (milled)",   Al: 62.5, Cr: 0, Cu: 25, Fe: 12.5, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC → B2 (milling)", HV: null, UTS: null, source: "Mukhopadhyay 2013",        grain_softening_nm: 40 },
  { formula: "Al65Cu20Fe15 (bulk props)",   Al: 65,   Cr: 0, Cu: 20, Fe: 15,   Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC",              HV: null, UTS: null, source: "Mukhopadhyay & Yadav 2022", E_GPa: 230, K_IC_MPa_m: 1.0, resistivity_uOhm_cm: 3950 },
  { formula: "Al60Cu25Fe15 (NaOH leached)", Al: 60,   Cr: 0, Cu: 25, Fe: 15,   Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC (catalyst)",   HV: null, UTS: null, source: "Kameoka 2004 (cited)",      leaching_agent: "NaOH", application: "H₂ via SRM", active_sites: "Cu/Fe + Fe₃O₄" },

  // Al-Cu-Fe-B mechanical alloying (process→phase)
  { formula: "Al67Cu20Fe10B3 (MA 4h)",  Al: 67, Cr: 0, Cu: 20, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, B: 3, phase: "i-QC",        HV: null, UTS: null, source: "AlCuFeB MA",  mill_h: 4,  note: "Optimal i-QC at 4h MA" },
  { formula: "Al67Cu20Fe10B3 (MA 10h)", Al: 67, Cr: 0, Cu: 20, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, B: 3, phase: "β-Al(Cu,Fe)", HV: null, UTS: null, source: "AlCuFeB MA",  mill_h: 10, note: "Over-milling destroys QC" },

  // Al-Ni-Fe decagonal
  { formula: "Al70Ni15Fe15", Al: 70, Cr: 0, Cu: 0, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Ni: 15, phase: "d-QC", HV: null, UTS: null, source: "Al-Ni-Fe lit.", note: "Decagonal — Ni replaces Cu role" },

  // ── Batch 2: dopant-threshold calibration (Wolf 2020, Sukhova 2021) ──
  // Cr on Al-Cu-Fe → drives i → d-QC transition
  { formula: "Al65Cu20Fe12Cr3",  Al: 65, Cr: 3,  Cu: 20, Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC + d-QC", HV: null, UTS: null, source: "Wolf 2020",    note: "Cr ~3 at% → i+d coexist" },
  { formula: "Al63Cu18Fe11Cr8",  Al: 63, Cr: 8,  Cu: 18, Fe: 11, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "d-QC",         HV: null, UTS: null, source: "Wolf 2020",    note: "Cr ≳8 at% → pure decagonal" },
  { formula: "Al60Cu18Fe12Cr10", Al: 60, Cr: 10, Cu: 18, Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "d-QC",         HV: null, UTS: null, source: "Wolf 2020" },

  // Ni dissolution / B2 destabilization (Sukhova 2021)
  { formula: "Al65Cu20Fe11Ni4", Al: 65, Cr: 0, Cu: 20, Fe: 11, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Ni: 4, phase: "i-QC",  HV: null, UTS: null, source: "Sukhova 2021", note: "Ni ≤4 at% tolerated" },
  { formula: "Al63Cu19Fe11Ni7", Al: 63, Cr: 0, Cu: 19, Fe: 11, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Ni: 7, phase: "i-QC + B2", HV: null, UTS: null, source: "Sukhova 2021", note: "Ni >4 → B2 forms" },
  { formula: "Al60Cu18Fe13Ni9", Al: 60, Cr: 0, Cu: 18, Fe: 13, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Ni: 9, phase: "B2",       HV: null, UTS: null, source: "Sukhova 2021", note: "Ni ≈9 → B2 dominant" },

  // Si substitution for Al (Sukhova 2021)
  { formula: "Al63Cu20Fe15Si2",  Al: 63, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Si: 2, phase: "i-QC",        HV: 780, UTS: null, source: "Sukhova 2021", note: "Si ≤2 → higher i-QC fraction, lower porosity" },
  { formula: "Al60Cu20Fe15Si5",  Al: 60, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Si: 5, phase: "i-QC",        HV: 760, UTS: null, source: "Sukhova 2021", note: "Si at upper edge" },
  { formula: "Al58Cu20Fe15Si7",  Al: 58, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Si: 7, phase: "Approximant", HV: null, UTS: null, source: "Sukhova 2021", note: "Si >5 → approximant" },

  // Si+B synergy (highest hardness + toughness)
  { formula: "Al63Cu20Fe14Si2B1", Al: 63, Cr: 0, Cu: 20, Fe: 14, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, B: 1, Si: 2, phase: "i-QC", HV: 820, UTS: null, source: "Sukhova 2021", note: "Si+B synergy — peak HV + toughness" },

  // Rapid solidification — high cooling rate favors i-QC, suppresses β
  { formula: "Al65Cu20Fe15 (melt-spun)", Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: null, UTS: null, source: "Melt-spinning", coolingRate: 1e6, note: ">1e4 °C/s suppresses β" },

  // ── Batch 3: Ag/Zn antibacterial + processing-path rules ──
  // Ag substitution (~1 at% replacing Cu) — antibacterial synergy with Cu/Cu₂O
  { formula: "Al63Cu24Fe12Ag1",   Al: 63, Cr: 0, Cu: 24, Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Ag: 1,    phase: "i-QC", HV: null, UTS: null, source: "Ag-doped AlCuFe", DIZ_mm: 22, note: "Ag~1 at% — Cu/Cu₂O antibacterial synergy, stays i-QC" },

  // Zn substitution (0.5–4 at% replacing Cu) — QC+β retained, DIZ tunable
  { formula: "Al63Cu24.5Fe12Zn0.5", Al: 63, Cr: 0, Cu: 24.5, Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Zn: 0.5, phase: "i-QC + β", HV: null, UTS: null, source: "Zn-doped AlCuFe", DIZ_mm: 24, note: "Best Gram+ kill at Zn=0.5" },
  { formula: "Al63Cu23Fe12Zn2",    Al: 63, Cr: 0, Cu: 23,   Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Zn: 2,   phase: "i-QC + β", HV: null, UTS: null, source: "Zn-doped AlCuFe", DIZ_mm: 25 },
  { formula: "Al63Cu21Fe12Zn4",    Al: 63, Cr: 0, Cu: 21,   Fe: 12, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Zn: 4,   phase: "i-QC + β", HV: null, UTS: null, source: "Zn-doped AlCuFe", DIZ_mm: 26, note: "Best Gram− kill at Zn=4 (DIZ≈26 mm)" },

  // Tcherdyntsev 2002 — MA-only vs MA + anneal reaction path
  { formula: "Al65Cu20Fe15 (MA 20h, no anneal)", Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, millingHours: 20, annealedAboveC: 0,   phase: "β/B2 + unreacted", HV: null, UTS: null, source: "Tcherdyntsev 2002", note: "MA alone: bcc Al(Cu,Fe)+Al₂Cu → Al₇Cu₂Fe+D8.3; no QC" },
  { formula: "Al65Cu20Fe15 (MA 20h + 400°C)",   Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, millingHours: 20, annealedAboveC: 400, phase: "β-Al(Cu,Fe)",      HV: null, UTS: null, source: "Tcherdyntsev 2002", note: "Anneal <500°C insufficient — β retained" },
  { formula: "Al65Cu20Fe15 (MA 20h + 750°C)",   Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, millingHours: 20, annealedAboveC: 750, phase: "i-QC",             HV: null, UTS: null, source: "Tcherdyntsev 2002", note: "Single-phase i-QC after ≥700°C anneal" },

  // Porosity hardness penalty: PM vs cast
  { formula: "Al65Cu20Fe15 (PM, porous)", Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, porous: true, phase: "i-QC", HV: 220, HV_GPa: 2.2,  UTS: null, source: "PM thesis", note: "Porosity → ~2.2 GPa" },
  { formula: "Al65Cu20Fe15 (cast/HIP)",   Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,               phase: "i-QC", HV: 785, HV_GPa: 7.85, UTS: null, source: "Cast/HIP",  note: "Dense cast i-QC ~7.85 GPa" },

  // NaOH leaching of Ag/Zn-doped i-QC — surface oxides as antibacterial sites
  { formula: "Al60Cu24Fe14Ag1Zn1 (NaOH leached)", Al: 60, Cr: 0, Cu: 24, Fe: 14, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, Ag: 1, Zn: 1, phase: "i-QC (core) + Cu/Cu₂O/CuFe₂O₄", HV: null, UTS: null, source: "Leaching study", leaching_agent: "NaOH", active_sites: "Cu, Fe, Cu₂O, CuFe₂O₄, β", note: "QC core preserved; oxide surface = antibacterial sites" },

  // Single-phase Al-Cu-Fe QC window (phase-diagram boundaries)
  { formula: "Al58Cu28Fe14 (window edge)", Al: 58, Cr: 0, Cu: 28, Fe: 14, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: null, UTS: null, source: "Phase diagram", note: "Lower-Al edge of pure Al-Cu-Fe i-QC window" },
  { formula: "Al70Cu20Fe10 (window edge)", Al: 70, Cr: 0, Cu: 20, Fe: 10, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: null, UTS: null, source: "Phase diagram", note: "Upper-Al edge; beyond → ω-phase boundary" },

  // ── Batch 5: nanocrystalline + catalysis + non-Al-Cu-Fe stable QC systems ──
  // Inverse Hall-Petch in nanocrystalline i-Al-Cu-Fe (grain size < ~40 nm → softening)
  { formula: "Al65Cu20Fe15 (nano, 25 nm)",  Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 480, UTS: null, source: "Inverse H-P", grain_size_nm: 25, note: "Inverse Hall-Petch — hardness drops below ~40 nm grain size" },
  { formula: "Al65Cu20Fe15 (nano, 60 nm)",  Al: 65, Cr: 0, Cu: 20, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: 690, UTS: null, source: "Inverse H-P", grain_size_nm: 60, note: "Above 40 nm threshold — normal Hall-Petch regime" },

  // Catalysis (post-leach) — methanol steam reforming on leached i-Al-Cu-Fe
  { formula: "Al60Cu25Fe15 (Na₂CO₃ leached)",      Al: 60, Cr: 0, Cu: 25, Fe: 15, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 0,         phase: "i-QC (catalyst)", HV: null, UTS: null, source: "Catalysis lit.", leaching_agent: "Na₂CO₃", application: "SRM → H₂", active_sites: "Cu/Fe (Fe disperses Cu, no sintering)", note: "Thinner leached layer + better thermal stability than NaOH" },
  { formula: "Al60Cu22Fe13Co5 (NaOH leached)",     Al: 60, Cr: 0, Cu: 22, Fe: 13, Mn: 0, V: 0, Ti: 0, Ce: 0, Co: 5,         phase: "i-QC + d-QC (catalyst)", HV: null, UTS: null, source: "Catalysis lit.", leaching_agent: "NaOH", application: "Methanol decomposition → CO", active_sites: "Cu/Co", selectivity: "shifted toward CO", note: "Co shifts selectivity from SRM (H₂) → MD (CO)" },

  // Known stable QC systems outside Al-Cu-Fe-(Mn) jurisdiction — tagged out-of-scope (NOT mis-labeled non-QC)
  { formula: "Al70Pd20Mn10 (i-QC)",          Al: 70, Cr: 0, Cu: 0, Fe: 0, Mn: 10, V: 0, Ti: 0, Ce: 0, Co: 0, phase: "i-QC", HV: null, UTS: null, source: "Tsai 1990",       system: "Al-Pd-Mn",   note: "Canonical Tsai-type i-QC; Pd not in predictor scope" },
  { formula: "Al65Cu20Co15 (d-QC)",          Al: 65, Cr: 0, Cu: 20, Fe: 0, Mn: 0,  V: 0, Ti: 0, Ce: 0, Co: 15, phase: "d-QC", HV: null, UTS: null, source: "Burkov 1993",     system: "Al-Cu-Co",   note: "Decagonal QC, no Fe — outside i-Al-Cu-Fe band" },
  { formula: "Al72Ni12Co16 (d-QC)",          Al: 72, Cr: 0, Cu: 0,  Fe: 0, Mn: 0,  V: 0, Ti: 0, Ce: 0, Co: 16, Ni: 12, phase: "d-QC", HV: null, UTS: null, source: "Tsai 1989",   system: "Al-Ni-Co",   note: "Stable basic-Ni decagonal" },
  { formula: "Ti41.5Zr41.5Ni17 (i-QC)",      Al: 0,  Cr: 0, Cu: 0,  Fe: 0, Mn: 0,  V: 0, Ti: 41.5, Ce: 0, Co: 0, Ni: 17, phase: "i-QC", HV: null, UTS: null, source: "Kelton 1997", system: "Ti-Zr-Ni",   application: "H storage", note: "Hydrogen-storage i-QC, no Al" },
  { formula: "Zn60Mg30Y10 (i-QC)",           Al: 0,  Cr: 0, Cu: 0,  Fe: 0, Mn: 0,  V: 0, Ti: 0, Ce: 0, Co: 0,         phase: "i-QC", HV: null, UTS: null, source: "Luo 1993",     system: "Zn-Mg-RE",   note: "Zn-Mg-rare-earth Tsai-type" },
  { formula: "Cd5.7Yb (i-QC)",               Al: 0,  Cr: 0, Cu: 0,  Fe: 0, Mn: 0,  V: 0, Ti: 0, Ce: 0, Co: 0,         phase: "i-QC", HV: null, UTS: null, source: "Tsai 2000",    system: "Cd-Yb",      note: "Binary Tsai-type — first binary i-QC" },
  { formula: "Ag42In42Yb16 (i-QC)",          Al: 0,  Cr: 0, Cu: 0,  Fe: 0, Mn: 0,  V: 0, Ti: 0, Ce: 0, Co: 0, Ag: 42, phase: "i-QC", HV: null, UTS: null, source: "Guo 2007",     system: "Ag-In-Yb",   note: "Ternary Tsai-type, RE-bearing" },
  { formula: "Au65Ga20Dy15 (ferromag i-QC)", Al: 0,  Cr: 0, Cu: 0,  Fe: 0, Mn: 0,  V: 0, Ti: 0, Ce: 0, Co: 0,         phase: "i-QC", HV: null, UTS: null, source: "Tamura 2021",  system: "Au-Ga-Dy",   note: "First long-range-ordered ferromagnetic i-QC (T_C ~ 4 K)" },
];


// Map dataset phase to predictor categories (now includes DQC)
function reportedKind(r: RawRow): Kind {
  const p = r.phase.toLowerCase().trim();
  // Pure decagonal
  if (p === "d-qc" || p === "d-phase") return "DQC";
  // Coexistence / mixed → approximant bucket for scoring (predictor returns APPROX too)
  if (p.includes("d-qc") && p.includes("i-qc")) return "APPROX";
  // i-QC + β minor — QC remains dominant phase
  if (p.includes("i-qc") && p.includes("β") && !p.includes("b2")) return "QC";
  if (p.includes("b2") || p.includes("approx") || p.startsWith("am") || p === "β" || p.startsWith("β-") || p.startsWith("β/")) return "APPROX";
  if (p.includes("i-qc") || p.includes("qc")) return "QC";
  return "ORDINARY";
}

// Project to Al-Cu-Fe-Mn and renormalize to 100%
function projectAlCuFeMn(r: RawRow): { comp: Comp; otherPct: number } {
  const sub = r.Al + r.Cu + r.Fe + r.Mn;
  const total =
    r.Al + r.Cr + r.Cu + r.Fe + r.Mn + r.V + r.Ti + r.Ce + r.Co +
    (r.Ni ?? 0) + (r.B ?? 0) + (r.Si ?? 0) + (r.Ag ?? 0) + (r.Zn ?? 0);
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
  predictFromExt: (
    c: Comp,
    hints?: { co?: number; cr?: number; ni?: number; b?: number; si?: number; ag?: number; zn?: number; coolingRate?: number; millingHours?: number; annealedAboveC?: number; porous?: boolean }
  ) => {
    label: string;
    kind: string;
    confidence: number;
    color: string;
    ea: number;
    api: number;
  };
}

type ScopeReason =
  | "decagonal class"
  | "Al-rich window (Al > 72)"
  | "Cu > 27 (out of i-QC band)"
  | "Cr/Co/Ni base (phase-determining)"
  | "V/Ti/Ce stabilizer"
  | "Al/Fe out of i-QC window"
  | "Non-Al-Cu-Fe-(Mn) QC system";

function classifyScope(r: RawRow, expected: Kind): { inScope: boolean; reason?: ScopeReason } {
  if (r.system) return { inScope: false, reason: "Non-Al-Cu-Fe-(Mn) QC system" };
  if (expected === "DQC") return { inScope: false, reason: "decagonal class" };
  if (r.V > 0 || r.Ti > 0 || r.Ce > 0) return { inScope: false, reason: "V/Ti/Ce stabilizer" };
  if (r.Cr > 0 || r.Co > 0 || (r.Ni ?? 0) > 0) return { inScope: false, reason: "Cr/Co/Ni base (phase-determining)" };
  if (r.Al > 72) return { inScope: false, reason: "Al-rich window (Al > 72)" };
  if (r.Cu > 27) return { inScope: false, reason: "Cu > 27 (out of i-QC band)" };
  if (r.Al < 58 || r.Fe < 10 || r.Fe > 15 || r.Cu < 10) {
    return { inScope: false, reason: "Al/Fe out of i-QC window" };
  }
  return { inScope: true };
}


export function ReferenceDataset({ loadExternalComp, predictFromExt }: Props) {
  const [showOnlyMatch, setShowOnlyMatch] = useState<"all" | "match" | "miss">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "in" | "out">("all");

  const rows = useMemo(() => {
    return DATA.map((r) => {
      const { comp, otherPct } = projectAlCuFeMn(r);
      // Wire legacy process fields → hint shape the predictor reads
      const milledByName = /\bmilled\b|\bMA\b/i.test(r.formula);
      const millingHours =
        r.millingHours ?? r.mill_h ?? (milledByName && r.anneal_temp == null && r.temp_C == null ? 8 : undefined);
      // anneal_temp (Lee), temp_C (Rosas annealing series) both indicate heat-treatment temp
      const annealedAboveC =
        r.annealedAboveC ?? r.anneal_temp ?? r.temp_C ?? undefined;
      const pred = predictFromExt(comp, {
        co: r.Co, cr: r.Cr, ni: r.Ni, b: r.B, si: r.Si, ag: r.Ag, zn: r.Zn,
        coolingRate: r.coolingRate, millingHours, annealedAboveC, porous: r.porous,
      });
      const expected = reportedKind(r);
      const match = pred.kind === expected;
      const scope = classifyScope(r, expected);
      return { r, comp, otherPct, pred, expected, match, scope };
    });
  }, [predictFromExt]);


  const stats = useMemo(() => {
    const total = rows.length;
    const matches = rows.filter((x) => x.match).length;
    const inScope = rows.filter((x) => x.scope.inScope);
    const inScopeMatches = inScope.filter((x) => x.match).length;
    const outOfScope = rows.filter((x) => !x.scope.inScope);
    // Group out-of-scope by reason
    const gap: Record<string, number> = {};
    outOfScope.forEach((x) => {
      const k = x.scope.reason ?? "other";
      gap[k] = (gap[k] ?? 0) + 1;
    });
    return {
      total,
      matches,
      pct: total ? (matches / total) * 100 : 0,
      inScopeTotal: inScope.length,
      inScopeMatches,
      inScopePct: inScope.length ? (inScopeMatches / inScope.length) * 100 : 0,
      outOfScopeTotal: outOfScope.length,
      gap,
    };
  }, [rows]);

  const filtered = rows.filter((x) => {
    if (showOnlyMatch === "match" && !x.match) return false;
    if (showOnlyMatch === "miss" && x.match) return false;
    if (scopeFilter === "in" && !x.scope.inScope) return false;
    if (scopeFilter === "out" && x.scope.inScope) return false;
    return true;
  });

  const kindColor = (k: string) =>
    k === "QC" ? "#22C55E" : k === "DQC" ? "#a855f7" : k === "APPROX" ? "#F59E0B" : "#EF4444";

  const scoreColor = stats.inScopePct >= 75 ? "#22C55E" : stats.inScopePct >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <section className="lg:col-span-12 rounded-xl border border-border bg-card p-5">
      <div className="mb-1 text-xs uppercase tracking-wider text-primary">Reference Dataset & Calibration</div>
      <h2 className="text-lg font-semibold">📚 Predictor Accuracy — Experimental Ground Truth</h2>

      {/* PROMINENT ACCURACY BADGES — in-scope (headline) + overall */}
      <div className="my-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: scoreColor + "66", background: scoreColor + "12" }}
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            In-scope accuracy — Al-Cu-Fe-(Mn/Ag/Zn/B/Si) jurisdiction
          </div>
          <div className="data-mono text-3xl font-bold" style={{ color: scoreColor }}>
            {stats.inScopePct.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.inScopeMatches} / {stats.inScopeTotal} hits · Al 58–72, Cu 10–27, Fe 10–15, no Cr/Co/Ni/V/Ti/Ce
          </div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Overall accuracy <span className="italic">(includes out-of-scope stress tests)</span>
          </div>
          <div className="data-mono text-3xl font-bold text-foreground">
            {stats.pct.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.matches} / {stats.total} hits · {stats.outOfScopeTotal} rows are out-of-scope stress tests
          </div>
        </div>
      </div>

      {/* COVERAGE GAP — roadmap for ML extension */}
      {stats.outOfScopeTotal > 0 && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-amber-300">
            Coverage gap ({stats.outOfScopeTotal} rows) — roadmap for the Random-Forest extension
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
            {Object.entries(stats.gap)
              .sort((a, b) => b[1] - a[1])
              .map(([reason, n]) => (
                <li key={reason}>
                  • <span className="text-foreground">{reason}</span>{" "}
                  <span className="data-mono">×{n}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* FILTERS */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Filter:</span>
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as "all" | "in" | "out")}
          className="rounded-md border border-border bg-secondary px-2 py-1"
        >
          <option value="all">All scopes</option>
          <option value="in">In-scope only</option>
          <option value="out">Out-of-scope only</option>
        </select>
        <select
          value={showOnlyMatch}
          onChange={(e) => setShowOnlyMatch(e.target.value as "all" | "match" | "miss")}
          className="rounded-md border border-border bg-secondary px-2 py-1"
        >
          <option value="all">Hits + misses</option>
          <option value="match">Hits only</option>
          <option value="miss">Misses only</option>
        </select>
        <span className="text-[10px] text-muted-foreground">Scores update live as predictor rules change</span>
      </div>

      {/* PROCESS → PHASE RULES */}
      <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-3 text-xs">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-primary">Process → Phase Rules (encoded)</div>
        <ul className="space-y-1 text-muted-foreground">
          <li>• <span className="text-foreground">Al-Cu-Fe-B:</span> optimal i-QC at ~4 h mechanical alloying. Over-milling (10 h) → β-Al(Cu,Fe). i-QC stable only ≤300 °C.</li>
          <li>• <span className="text-foreground">Al-Cu-Fe:</span> pure i-QC at 700 °C / 72 h anneal. Decomposes to β above ~884 °C (peritectic).</li>
          <li>• <span className="text-foreground">Al-Cu-Fe-Co:</span> Co 0–3% → i-QC; 5% → i+d coexist; &gt;8% → pure d-QC.</li>
          <li>• <span className="text-foreground">Al-Cu-Fe-Cr (Wolf 2020):</span> ~3 at% Cr → i+d coexist; ≳8 at% Cr → pure d-QC.</li>
          <li>• <span className="text-foreground">Al-Cu-Fe-Ni (Sukhova 2021):</span> i-QC tolerates ≤4 at% Ni; &gt;4 at% → B2 cubic; B2 major at Ni ≈ 9.</li>
          <li>• <span className="text-foreground">Al-Cu-Fe-Si (replacing Al):</span> ≤2 at% Si raises i-QC fraction + hardness, cuts porosity; &gt;5 at% → approximant.</li>
          <li>• <span className="text-foreground">B + Si synergy:</span> small B suppresses θ-Al₂Cu and refines grains; Si+B together = peak hardness + toughness.</li>
          <li>• <span className="text-foreground">Cooling rate &gt;10⁴ °C/s:</span> favors i-QC, suppresses β. Microhardness: i-QC (ψ) &gt; λ-Al₁₃Fe₄ &gt; β ≈ τ ≈ η &gt; θ-Al₂Cu.</li>
          <li>• <span className="text-foreground">Mechanical alloying (Tcherdyntsev 2002):</span> MA alone → β/B2 + unreacted elements, NOT QC. Path: elements → bcc Al(Cu,Fe)+Al₂Cu → Al₇Cu₂Fe+D8.3(Al₄Cu₉) → i-QC. QC only appears after anneal &gt;500 °C; single-phase needs ~700–800 °C. Over-milling → β dominates.</li>
          <li>• <span className="text-foreground">Ag (~1 at%, subs Cu):</span> antibacterial synergy with Cu/Cu₂O, stays icosahedral.</li>
          <li>• <span className="text-foreground">Zn 0.5–4 at% (subs Cu):</span> tunes e/a, boosts DIZ; QC+β retained. Best Gram−ve kill at Zn=4 (DIZ≈26 mm); best Gram+ve at Zn=0.5.</li>
          <li>• <span className="text-foreground">NaOH dealloying of i-Al-Cu-Fe(-Ag-Zn):</span> QC core preserved; surface → Cu, Fe, Cu₂O, CuFe₂O₄, β. Cu oxides = antibacterial active sites.</li>
          <li>• <span className="text-foreground">Porosity penalty:</span> powder-metallurgy i-QC HV ≈ 2.2 GPa due to porosity; cast/HIP reaches ~7.85 GPa.</li>
          <li>• <span className="text-foreground">Single-phase Al-Cu-Fe window:</span> between Al₅₈Cu₂₈Fe₁₄ and Al₇₀Cu₂₀Fe₁₀ (ω-phase boundary above Al₇₀). Use to validate any pure Al-Cu-Fe prediction.</li>
        </ul>
      </div>

      {/* DUBOIS 2023 REFERENCE ANCHORS */}
      <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-sky-300">Physical-property anchors (Dubois 2023) — apply to any i-QC prediction</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
          <div>• Thermal conductivity i-Al-Cu-Fe ≈ <span className="text-foreground data-mono">1 W/mK @ 300 K</span> (vs Al 240)</div>
          <div>• Surface energy <span className="text-foreground data-mono">0.6–0.8 J/m²</span> (vs Al 1.2, Cu 1.8, Fe 2.2)</div>
          <div>• Cookware/coating thermally stable to <span className="text-foreground data-mono">~300 °C</span></div>
          <div>• Stability mechanism: <span className="text-foreground">Hume-Rothery pseudogap at E_F</span></div>
          <div className="sm:col-span-2 italic">Marketed uses: maraging steel precipitates · Al-Cu-Fe-B polymer composites for 3D printing · anti-counterfeit labels.</div>
        </div>
      </div>

      {/* OTHER KNOWN STABLE QC SYSTEMS — don't mis-flag */}
      <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 text-xs">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-purple-300">Other known stable QC systems (out of current predictor scope — tagged out-of-scope, do not mis-flag)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-muted-foreground data-mono">
          <span>• Al-Cu-Li (i)</span>
          <span>• Al-Pd-Mn (i)</span>
          <span>• Al-Co-Ni / Al-Ni-Co (d)</span>
          <span>• Al-Cu-Co (d)</span>
          <span>• Al-Cu-Fe-Cr (d)</span>
          <span>• Ti-Zr-Ni (i, H storage)</span>
          <span>• Zn-Mg-RE (i)</span>
          <span>• Cd-Yb (binary i)</span>
          <span>• Ag-In-Yb (i)</span>
          <span>• Au-Ga-Dy (ferromagnetic i)</span>
          <span>• Al-Zn-Mg (superconducting i)</span>
        </div>
      </div>

      {/* PROPERTY/REFERENCE KNOWLEDGE (does NOT override phase prediction) */}
      <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-emerald-300">Property & structure references (explanation layer only — not used for phase prediction)</div>
        <ul className="space-y-1 text-muted-foreground">
          <li>• <span className="text-foreground">Inverse Hall-Petch:</span> in nanocrystalline i-Al-Cu-Fe, hardness <em>decreases</em> below ~40 nm grain size (opposite of classical Hall-Petch). Flag whenever grain size &lt; 40 nm.</li>
          <li>• <span className="text-foreground">Catalysis (post-leach):</span> Cu-bearing leached i-Al-Cu-Fe → steam reforming of methanol (SRM → H₂). Fe disperses Cu and prevents sintering. Na₂CO₃ leach → thinner active layer + better thermal stability than NaOH. Co doping shifts selectivity toward CO (methanol decomposition). Surface property — does NOT change the bulk QC phase.</li>
          <li>• <span className="text-foreground">Structure / clusters:</span> Mackay · Bergman · Tsai. 6-D icosahedral lattice via cut-and-project; deviations = phason strain → approximants. Simple-icosahedral (SI) → face-centered-icosahedral (FCI) via chemical ordering (e.g. Al-Mn).</li>
        </ul>
      </div>




      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 text-left">Formula</th>
              <th className="px-2 py-2 text-right">Al</th>
              <th className="px-2 py-2 text-right">Cu</th>
              <th className="px-2 py-2 text-right">Fe</th>
              <th className="px-2 py-2 text-right">Mn</th>
              <th className="px-2 py-2 text-right">Cr</th>
              <th className="px-2 py-2 text-right">Co</th>
              <th className="px-2 py-2 text-right">Ni</th>
              <th className="px-2 py-2 text-right">B</th>
              <th className="px-2 py-2 text-right">Si</th>
              <th className="px-2 py-2 text-right">Ag</th>
              <th className="px-2 py-2 text-right">Zn</th>
              <th className="px-2 py-2 text-right">Other</th>
              <th className="px-2 py-2 text-left">Reported</th>
              <th className="px-2 py-2 text-left">Predicted</th>
              <th className="px-2 py-2 text-center">Hit/Miss</th>
              <th className="px-2 py-2 text-center">Scope</th>
              <th className="px-2 py-2 text-left">Source</th>
              <th className="px-2 py-2 text-left">Conditions / Notes</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="data-mono">
            {filtered.map(({ r, comp, otherPct, pred, expected, match, scope }) => (
              <tr
                key={r.formula}
                className="border-b border-border/50 hover:bg-secondary/30"
                style={{ borderLeft: `3px solid ${kindColor(expected)}`, opacity: scope.inScope ? 1 : 0.78 }}
              >
                <td className="px-2 py-1.5 font-sans">{r.formula}</td>
                <td className="px-2 py-1.5 text-right">{r.Al}</td>
                <td className="px-2 py-1.5 text-right">{r.Cu || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Fe || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Mn || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Cr || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Co || "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Ni ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.B ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Si ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Ag ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{r.Zn ?? "—"}</td>

                <td className="px-2 py-1.5 text-right text-amber-300">
                  {otherPct > 0 ? otherPct.toFixed(1) : "—"}
                </td>
                <td className="px-2 py-1.5 font-sans" style={{ color: kindColor(expected) }}>
                  {r.phase}
                </td>
                <td className="px-2 py-1.5 font-sans" style={{ color: pred.color }}>
                  {pred.label}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({pred.confidence.toFixed(0)}%)
                  </span>
                </td>
                <td className="px-2 py-1.5 text-center font-bold" style={{ color: match ? "#22C55E" : "#EF4444" }}>
                  {match ? "✓ HIT" : "✗ MISS"}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {scope.inScope ? (
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      IN
                    </span>
                  ) : (
                    <span
                      className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                      title={scope.reason}
                    >
                      OUT
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 font-sans text-muted-foreground">{r.source}</td>
                <td className="px-2 py-1.5 font-sans text-[10px] text-muted-foreground">
                  {[
                    r.temp_C != null ? `${r.temp_C}°C` : null,
                    r.time_h != null ? `${r.time_h}h` : null,
                    r.anneal_temp != null ? `anneal ${r.anneal_temp}°C/${r.anneal_h ?? 0}h` : null,
                    r.mill_h != null ? `MA ${r.mill_h}h` : null,
                    r.i_phase_pct != null ? `i-φ ${r.i_phase_pct}%` : null,
                    r.wear_rate != null ? `wear ${(r.wear_rate * 1e4).toFixed(2)}e-4` : null,
                    r.friction != null ? `μ ${r.friction}` : null,
                    r.HV != null ? `HV ${r.HV}` : null,
                    r.HV_GPa != null ? `HV ${r.HV_GPa} GPa` : null,
                    r.DIZ_mm != null ? `DIZ ${r.DIZ_mm} mm` : null,
                    r.millingHours != null ? `MA ${r.millingHours}h` : null,
                    r.annealedAboveC != null ? `anneal ${r.annealedAboveC}°C` : null,
                    r.porous ? "porous PM" : null,
                    r.E_GPa != null ? `E ${r.E_GPa} GPa` : null,
                    r.K_IC_MPa_m != null ? `K_IC ${r.K_IC_MPa_m} MPa·m^½` : null,
                    r.resistivity_uOhm_cm != null ? `ρ ${r.resistivity_uOhm_cm} μΩ·cm` : null,
                    r.grain_softening_nm != null ? `softening < ${r.grain_softening_nm} nm` : null,
                    r.leaching_agent ? `leach: ${r.leaching_agent}` : null,
                    r.application ? `app: ${r.application}` : null,
                    r.active_sites ? `sites: ${r.active_sites}` : null,
                    r.note ?? null,
                  ].filter(Boolean).join(" · ") || "—"}
                </td>
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
        Predictor projects multi-element rows onto Al-Cu-Fe-Mn but receives Co/Ni/B as hints (Co ≥ 5 at%
        enables d-QC branch, B 1–3 at% refines i-QC). Misses against Cr/V/Ti/Si-stabilised approximants
        motivate the multi-element ML extension.
      </p>
    </section>
  );
}
