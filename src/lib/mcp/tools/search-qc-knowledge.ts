import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { QC_KNOWLEDGE } from "@/data/qc-knowledge";

export default defineTool({
  name: "search_qc_knowledge",
  title: "Search quasicrystal knowledge base",
  description:
    "Full-text search over the app's curated quasicrystal knowledge chunks (structure, Hume-Rothery rules, heat treatment, dopants, catalysis, XRD indexing, ML benchmarks). Returns matching chunks with id, title, tag and full body.",
  inputSchema: {
    query: z.string().describe("Search terms, e.g. 'peritectic 884' or 'decagonal cobalt'."),
    limit: z.number().default(5).describe("Maximum number of chunks to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = QC_KNOWLEDGE.map((c) => {
      const hay = `${c.title} ${c.tag} ${c.summary} ${c.body}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.split(t).length - 1), 0);
      return { c, score };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(limit ?? 5, 20)))
      .map(({ c }) => c);

    const result = { query, matches: scored.length, chunks: scored };
    return {
      content: [
        {
          type: "text",
          text: scored.length
            ? scored.map((c) => `[#${c.id} ${c.tag} — ${c.title}]\n${c.body}`).join("\n\n")
            : `No knowledge chunks matched "${query}".`,
        },
      ],
      structuredContent: result,
    };
  },
});
