// Quasicrystal knowledge chunks — RAG-style grounding for the AI model.
// Each entry is a self-contained fact dense document derived from primary literature
// (Tsai, Shechtman, Cahn, Mukhopadhyay & Yadav 2022 review, AlCuFeB MA study).
// Used by:
//   - <KnowledgeBasePanel /> for browsable display
//   - ai-analysis system prompt for grounding
//   - few-shot context for downstream model calls

export interface KnowledgeChunk {
  id: number;
  title: string;
  tag: string;
  summary: string;
  body: string;
}

export const QC_KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: 1,
    title: "Core concept (grounding)",
    tag: "CONCEPT",
    summary: "QCs as a third class of solid; stable vs metastable; approximants & τ.",
    body:
      "Quasicrystals (QCs) are a third class of solid: long-range order without translational periodicity, showing rotational symmetries forbidden to periodic crystals. Icosahedral QCs (IQCs) are 3D. First QC: Al-Mn, Shechtman 1984, made by rapid solidification → metastable, high defect density, decomposes on heating well below melting. Stable IQCs are equilibrium phases, grow at slow cooling, form large single domains. An approximant is a periodic crystal with composition close to the IQC and the same atomic clusters (e.g. icosahedral clusters); obtained via cut-and-projection with rational Fibonacci slopes (1/1, 2/1, 3/2, 5/3…), while the IQC uses the irrational golden mean τ=(1+√5)/2.",
  },
  {
    id: 2,
    title: "Lattice types",
    tag: "STRUCTURE",
    summary: "P-, body-centered, F-type 6D lattices. All stable Al-based IQCs are F-type.",
    body:
      "IQCs have three possible 6D translational symmetries: primitive (P-type), body-centered, face-centered (F-type). Al-Cu-Fe was the first F-type IQC; all stable Al-based IQCs are F-type (odd-even parity). Cd-Yb and Cd-Mg-RE IQCs are P-type. Diffraction quality: stable Al-Cu-Fe shows innermost spots at ~22 Å (τ⁵ scaling), vs <10 Å for metastable IQCs → much higher order. Zigzag radial arrays of weak peaks = linear phason strain = signature of an approximant / metastable IQC.",
  },
  {
    id: 3,
    title: "Stable IQC systems & compositions (labeled dataset)",
    tag: "DATASET",
    summary: "Al-Li-Cu, Al-Cu-Fe, Al-Pd-Mn, Zn-Mg-RE, Cd-Yb, Zn-Sc, In-Ag-Yb, Au-Al-Yb.",
    body:
      "Al-Li-Cu: Al5.5Li3Cu1 (was 'T2'), P-type, rhombic triacontahedral, correlation length 500-1000 Å; 1/1 approximant Al6Li3Cu. Air-sensitive (Li). " +
      "Al-Cu-Fe: Al65Cu20Fe15 → stoichiometric Al63Cu25Fe12, F-type, pentagonal dodecahedral; decomposes ~860 °C; correlation length ~3000 Å after 800 °C anneal; structural transition at 670 °C. " +
      "Al-Cu-Ru / Al-Cu-Os: Al65Cu20Ru15, Al65Cu20Os15. " +
      "Al-Pd-Mn group: Al70Pd20TM10 (TM = Mn, Tc, Re), F-type; L→IQC gap only ~20 °C → single grains growable by floating zone at ~10 °C/h. " +
      "Zn-Mg-RE: Zn60Mg30RE10 (RE = Y, Gd, Tb, Dy, Ho, Er), F-type, ~3000 Å; P-type variant Zn75Mg14Er11. Spin-glass / AFM short-range order in Zn-Mg-Ho. " +
      "Cd-Yb: Cd5.7Yb (≈Cd84Yb16), first stable binary IQC, P-type; 1/1 approximant Cd6Yb (space group Im-3, a=15.64 Å). " +
      "Cd-Ca: Cd17Ca3 IQC; Cd6Ca 1/1 approximant. " +
      "Zn-Sc: Zn6Sc 1/1 approximant (no stable binary IQC); Zn88Sc12 IQC; stabilized as Zn80Mg5Sc15. " +
      "In-Ag-Yb / In-Ag-Ca: In42Ag42Yb16, In42Ag42Ca16. " +
      "Au-Al-Yb: IQC + 1/1 approximant with intermediate Yb valence (no doping/pressure).",
  },
  {
    id: 4,
    title: "e/a (Hume-Rothery) feature — key predictor",
    tag: "PREDICTOR",
    summary: "Stable IQCs are Hume-Rothery electron compounds. Target e/a values.",
    body:
      "Stable IQCs are Hume-Rothery electron compounds: stability dominated by valence-electron-per-atom ratio e/a, set by Fermi-sphere/Brillouin-zone (pseudo-zone) interaction giving a pseudogap at E_F when G ≈ 2k_F. Valences used: Al=3, Cu=1, Zn=2, Mg=2, Y/RE=3, In=3, Ag=1; Fe/Ru/Os e/a ≈ −2.66 (Raynor). Target e/a values: " +
      "Al63Cu25TM12 (Fe/Ru/Os): e/a = 1.75; " +
      "Al70Pd20TM10 (Mn/Tc/Re): e/a = 1.75; " +
      "Zn60Mg30Y10: e/a = 2.1; " +
      "Cd65Mg20RE15: e/a = 2.15; " +
      "In42Ag42Yb16: e/a = 2.0; " +
      "Zn-Sc base: e/a ≈ 2.15. " +
      "Cd-Yb-class range e/a ≈ 1.9-2.15; e/a = 2.0 critical for Cd-(Yb,Ca) and In-Ag-(Yb,Ca). Also applies to approximants.",
  },
  {
    id: 5,
    title: "Size feature & phase discrimination",
    tag: "PREDICTOR",
    summary: "Effective atomic size ratio R_r,e selects IQC vs 2/1 vs 1/1.",
    body:
      "Beyond e/a, atomic size decides which phase (IQC vs 2/1 vs 1/1). Effective atomic size ratio R_r,e = (r_M·C_M)/(r_A·C_A), A = major element (Cd/Zn/Ag/In). Phase windows: IQC R_r,e > 0.22; 2/1 approximant 0.21-0.23; 1/1 approximant < 0.22. RE elements with atomic radius > 1.8 Å do NOT form stable IQCs. Larger RE/Ca favor IQC or 2/1. Structural unit: rhombic triacontahedral (RTH) cluster (5 shells: Cd4 core → Cd20 dodecahedron → 12 Yb/RE icosahedron → Cd30 icosidodecahedron → 32+60 RTH); ~93.8% of IQC atoms belong to RTH; building blocks = acute rhombohedron (AR), obtuse rhombohedron (OR), RTH.",
  },
  {
    id: 6,
    title: "Cd-Mg-RE IQC vs 1/1 composition table",
    tag: "DATASET",
    summary: "RE content is higher in 1/1 approximant than IQC (~11-12 at% RE in IQC).",
    body:
      "1/1 approximant ↔ Quasicrystal:\n" +
      "(Cd,Mg)86.1Gd13.9 ↔ (Cd,Mg)88.8Gd11.2\n" +
      "(Cd,Mg)86.7Y13.3  ↔ (Cd,Mg)87.5Y12.5\n" +
      "(Cd,Mg)85.9Dy14.1 ↔ (Cd,Mg)87.1Dy12.9\n" +
      "(Cd,Mg)86.5Gd13.5 ↔ (Cd,Mg)88Gd12\n" +
      "(Cd,Mg)85.7Pr14.3 ↔ —\n" +
      "High cooling rate → IQC (stable at high T, entropy-favored); slow cooling → 1/1 approximant.",
  },
  {
    id: 7,
    title: "Al67Cu20Fe10B3 synthesis (process → phase)",
    tag: "PROCESS",
    summary: "Mechanical alloying + CIP route; ternary single-QC window.",
    body:
      "Mechanical alloying (MA): high-energy planetary mill (Retsch PM400), 300 rpm, ball:powder 30:1, 1 wt% stearic acid PCA, Ar atmosphere, 1 h on / 30 min rest. Then cold isostatic pressing (CIP) 400 MPa, 25 °C. Single-QC compositional window (ternary): Al60Cu27Fe13 to Al71Cu16Fe13. Adding B = reduce Al by equal at%; B (<1 wt%) invisible to XRD. ICP-MS after 3 h: Al 66.89, Cu 19.28, Fe 12.85, B 0.98 at%.",
  },
  {
    id: 8,
    title: "Milling-time → phase/microstructure (headline result)",
    tag: "TIME-SERIES",
    summary: "i-phase wt% peaks at 4 h MA (95%); β-Al(Cu,Fe) dominates at 10 h.",
    body:
      "i-phase (icosahedral QC) wt% vs milling time, with crystallite size & microstrain:\n" +
      "3 h: QC 92% (44.3 nm, 0.468%) + λ-Al3Fe 8%\n" +
      "4 h: QC 95% (40.4 nm, 0.567%) + λ 5% — optimum, ~single QC\n" +
      "5 h: QC 85% (32.7 nm, 0.672%) + β-Al(Cu,Fe) 15%\n" +
      "6 h: QC 68% (30.0 nm, 0.797%) + β 32%\n" +
      "7 h: QC 53% (23.1 nm, 0.865%) + β 47%\n" +
      "10 h: β-Al(Cu,Fe) 100% (13.1 nm, 1.137%), QC gone\n" +
      "Reaction path: Al+Cu→θ-Al2Cu; Al+Fe→λ-Al3Fe; θ+λ+remaining → i-AlCuFeB; prolonged MA → i → β-Al(Cu,Fe) (bcc CsCl/B2). QC i-phase stable only ≤ ~300 °C (stable 3 days at 300 °C); transforms to β + λ above ~400 °C. IQC lattice parameter a ≈ 15.53-15.56 Å; β a ≈ 2.95-2.99 Å.",
  },
  {
    id: 9,
    title: "Properties (targets)",
    tag: "PROPERTIES",
    summary: "Microhardness, density vs milling time; E 100-200 GPa; Hall-Petch.",
    body:
      "Microhardness vs milling time: 1 h 4.54 → 2 h 6.52 → 3 h 9.26 → 4 h 10.73 GPa (max) → 5 h 8.80 → 6 h 7.21 → 7 h 6.86 → 10 h 8.55 GPa. " +
      "Green density (g/cm³): 1 h 2.99, 2 h 2.94, 3 h 2.85, 4 h 2.79, 5 h 2.65, 6 h 2.54, 7 h 2.45, 10 h 2.21. " +
      "Young's modulus of QCs 100-200 GPa, hardness ≈10% of E. Hall-Petch: H = H0 + k_H·d^(−1/2). QC crystallite reaches nano regime (~23 nm at 7 h).",
  },
  {
    id: 10,
    title: "XRD fingerprint of i-AlCuFeB (Cahn indexing)",
    tag: "XRD",
    summary: "Cu Kα peaks with Cahn-Shechtman-Gratias indices; β superlattice → ordered B2.",
    body:
      "Cu Kα (λ=1.5406 Å), 40 kV/30 mA, 2θ 20-70°, step 0.01°, 0.6 s/step. i-phase peaks (2θ, Cahn-Shechtman-Gratias index): 23.66° (111)(000), 25.93° (311)(111), 27.53° (111)(100), 42.75° (211)(111) and 45.14° (221)(001) [two strongest], 63.87° (222)(002), 65.76° (322)(111). β-Al(Cu,Fe): (110) at 43.65°, superlattice (100) at 30.38° → ordered B2. DTA exothermic peaks: 1 h-milled 375 & 480 °C; 2 h 360 & 475 °C; 4 h & 6 h ~400 °C.",
  },
  {
    id: 11,
    title: "β-phase is the QC precursor (peritectic formation)",
    tag: "PROCESS",
    summary: "i-Al-Cu-Fe forms via peritectic β + L → i-QC at ~884°C; reverts to β at ~900°C.",
    body:
      "Reaction path on cooling/holding: β-Al(Cu,Fe) (bcc B2) + liquid → i-QC at ~884 °C (peritectic). At 700 °C, i-QC is the thermodynamically stable product (pure i-QC after 72 h anneal). Heating above ~884 °C reverts i-QC → β + L; near 900 °C only β-Al(Cu,Fe) remains. This justifies the process-gate: anneal in 600–880 °C window for QC; anneal > 884 °C → APPROX (β). Mechanistically: β supplies the local Mackay/Bergman cluster precursor; QC nucleation is templated from B2 short-range order.",
  },
  {
    id: 12,
    title: "Milling reversibility (QC ↔ β, ~10 nm critical)",
    tag: "PROCESS",
    summary: "Mechanical milling drives QC→β at ~10 nm grain size; high-T anneal reverses.",
    body:
      "Mechanical alloying / milling progressively refines the i-QC grain size and accumulates strain. Once crystallite size reaches a critical ~10 nm (typically by 7–10 h in planetary mill at 300 rpm, BPR 30:1), the icosahedral order collapses into bcc β-Al(Cu,Fe) (CsCl/B2). Annealing the milled powder at ≤ ~1073 K (≤ ~800 °C) reverses β → i-QC and recovers microhardness toward the 8–10 GPa range. This is why MA-only rows fail the process-gate and predict APPROX; an MA + ≥600 °C anneal step restores QC prediction.",
  },
  {
    id: 13,
    title: "Inverse Hall-Petch threshold (~40 nm)",
    tag: "PROPERTIES",
    summary: "Above ~40 nm: classical H-P hardening; below: softening (IHP).",
    body:
      "Hall-Petch: H = H0 + k_H · d^(-1/2) holds for nanocrystalline i-Al-Cu-Fe down to a critical grain size d_c ≈ 40 nm. Below d_c, grain-boundary-mediated deformation dominates and hardness decreases with further refinement (inverse Hall-Petch). Implication for the predictor's explanation layer: report 'IHP softening' whenever grain_size_nm < 40, even if phase prediction is still i-QC.",
  },
  {
    id: 14,
    title: "Composite strengthening & ω-Al₇Cu₂Fe reaction",
    tag: "PROPERTIES",
    summary: "Al + QC particles strengthened by load-transfer + dislocations + MLS (dominant). Above ~723 K → ω-Al₇Cu₂Fe.",
    body:
      "In Al-matrix / i-QC particle composites, yield-strength increase decomposes into three additive contributions: (i) load-bearing (Eshelby) transfer to stiff QC particles, (ii) Orowan / forest dislocation hardening, and (iii) matrix-ligament-size (MLS) refinement — MLS is typically the dominant term. Thermal exposure above ~723 K (~450 °C) triggers the interfacial reaction Al + i-Al-Cu-Fe → ω-Al₇Cu₂Fe (tetragonal approximant), which further raises yield strength but consumes the QC phase. Label this as an ω-phase reaction / property hint, not as a new QC-forming prediction band.",
  },
  {
    id: 15,
    title: "e/a validation — natural vs synthetic Al-Cu-Fe-Si",
    tag: "PREDICTOR",
    summary: "Cross-check: natural and synthetic Al-Cu-Fe-Si QCs both land at e/a ≈ 1.82, anchoring the Hume-Rothery engine.",
    body:
      "Natural icosahedrite (Al63Cu24Fe13 from the Khatyrka meteorite) and synthetic Al-Cu-Fe-Si quasicrystals both yield e/a ≈ 1.82 when computed with the same Raynor effective valences (Al=3, Cu=1, Fe≈−2.66, Si=4). This confirms the e/a engine is well-anchored: the canonical Al-Cu-Fe i-QC window sits at e/a ≈ 1.75–1.82, and Si substitution (up to ~2 at%) raises the effective value slightly without destabilizing the i-phase.",
  },
  {
    id: 16,
    title: "Leaching surface chemistry (NaOH)",
    tag: "PROCESS",
    summary: "NaOH selectively removes Al → Fe₂O₃ + Cu₂O top layer; QC core intact. Nanoparticles 5–20 nm, epitaxial.",
    body:
      "NaOH leaching of i-Al-Cu-Fe selectively dissolves aluminum: Al → NaAlO₂ (washed away) + residual Al₂O₃. The resulting surface hierarchy is: (1) top oxide layer Fe₂O₃ + Cu₂O, (2) subsurface Cu/Fe alloy + Fe₃O₄, (3) intact QC core. Oxide nanoparticles are 5–20 nm, epitaxially aligned to the quasicrystal (Cu(111) and Fe(110) parallel to QC dense planes). This epitaxial lock explains the anti-sintering thermal stability observed in catalysis experiments. Cu oxides are the antibacterial active sites; the QC skeleton provides structural stability.",
  },
  {
    id: 17,
    title: "Peritectic formation temperature (Huttunen review)",
    tag: "PROCESS",
    summary: "Huttunen lists peritectic QC formation at ~860 °C; treat as ~860–884 °C band.",
    body:
      "Huttunen-Saloranta et al. (review of Al-Cu-Fe phase diagrams) report the peritectic reaction β-Al(Cu,Fe) + liquid → i-QC at ~860 °C. This is consistent with the ~884 °C figure already embedded from Rosas 1998 / DTA data. For the predictor, treat the peritectic window as ~860–884 °C: annealing inside this band can yield mixed QC+β, while annealing above the upper bound drives full reversion to β. Below ~860 °C the i-QC is the thermodynamically stable solid-state product.",
  },
  {
    id: 18,
    title: "Synthesis-route map (optimal processing recommendation)",
    tag: "PROCESS",
    summary: "Casting → stable QC + crystals; melt-spin → metastable ribbon; gas atomization → spherical powder; MA → metastable solid-state.",
    body:
      "Four primary synthesis routes for Al-Cu-Fe-based quasicrystals: (1) CASTING — slow cooling from melt yields stable i-QC coexisting with crystalline phases (β, λ-Al13Fe4, θ-Al2Cu); best for bulk specimens and property studies. (2) MELT-SPINNING — rapid solidification (~10^6 °C/s) produces metastable i-QC ribbon; suppresses β nucleation, high defect density, decomposes on heating. (3) GAS ATOMIZATION — spherical powder particles with rapid cooling; used for plasma spraying and composite feedstock. (4) MECHANICAL ALLOYING — solid-state processing; i-QC forms only after post-MA anneal ≥700 °C; over-milling (>6–10 h) collapses i-QC into nanocrystalline β-Al(Cu,Fe). Use this map to populate the 'optimal processing' recommendation field.",
  },
  {
    id: 19,
    title: "Recycled feedstock & QC/PA6 composites",
    tag: "PROPERTIES",
    summary: "Al-Cu-Fe QC forms from recycled Al (Mn/Ca/Si impurities). QC/PA6 band gap ~1–1.3 eV (semiconducting).",
    body:
      "Al-Cu-Fe quasicrystals can be synthesized successfully from recycled aluminum feedstock even in the presence of Mn, Ca, and Si impurities. When compounded with PA6 (nylon-6) polymer matrix, the resulting QC/PA6 composite exhibits a semiconducting band gap of approximately 1–1.3 eV. This is an application-layer / property note only; the impurities do not open new QC-forming composition bands outside the validated Al-Cu-Fe-(Mn) window.",
  },
  {
    id: 20,
    title: "XRD identification of icosahedral QCs",
    tag: "XRD",
    summary: "Powder patterns index with 6 indices (N,M); self-similar by τ⁶; quasicrystallinity scored by peak deviation + Fibonacci spacing.",
    body:
      "Icosahedral quasicrystals are identified in powder XRD by indexing with six Miller-like indices (N/M notation) rather than the usual three. The diffraction pattern is self-similar under scaling by τ⁶ (where τ = (1+√5)/2). Practical 'quasicrystallinity' is scored by two criteria: (1) peak-position deviation from ideal τ-scaling must be small, and (2) peak intensities follow a Fibonacci-interval sequence. Use these rules only when explicitly asked to assess an XRD pattern; they do not override composition-based phase prediction.",
  },
];


/** Compact context string used as RAG grounding in the AI system prompt. */
export function buildKnowledgeContext(): string {
  return QC_KNOWLEDGE.map(
    (k) => `[#${k.id} ${k.tag} — ${k.title}]\n${k.body}`,
  ).join("\n\n");
}
