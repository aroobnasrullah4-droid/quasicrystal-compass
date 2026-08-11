import { defineMcp } from "@lovable.dev/mcp-js";
import predictQcPhase from "./tools/predict-qc-phase";
import searchQcKnowledge from "./tools/search-qc-knowledge";
import listQcKnowledge from "./tools/list-qc-knowledge";
import getQcKnowledgeChunk from "./tools/get-qc-knowledge-chunk";

export default defineMcp({
  name: "quasar-forge",
  title: "Quasar Forge",
  version: "0.1.0",
  instructions:
    "Tools for Quasar Forge, a quasicrystal phase-prediction research tool for Al-Cu-Fe-Mn alloys. Use `predict_qc_phase` to classify an alloy composition (at%) and get Hume-Rothery descriptors such as e/a. Use `list_qc_knowledge`, `search_qc_knowledge` and `get_qc_knowledge_chunk` to retrieve literature-grounded facts on quasicrystal structure, heat treatment, dopant effects and characterization. All data is public reference material; no user accounts are involved.",
  tools: [predictQcPhase, searchQcKnowledge, listQcKnowledge, getQcKnowledgeChunk],
});
