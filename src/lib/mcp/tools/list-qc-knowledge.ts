import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { QC_KNOWLEDGE } from "@/data/qc-knowledge";

export default defineTool({
  name: "list_qc_knowledge",
  title: "List quasicrystal knowledge chunks",
  description:
    "List every knowledge chunk in the app's quasicrystal knowledge base with id, tag, title and one-line summary. Use search_qc_knowledge or get_qc_knowledge_chunk to read full bodies.",
  inputSchema: {
    tag: z.string().optional().describe("Optional tag filter, e.g. STRUCTURE, DATASET, CONCEPT."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ tag }) => {
    const items = QC_KNOWLEDGE.filter(
      (c) => !tag || c.tag.toLowerCase() === tag.toLowerCase(),
    ).map(({ id, tag: t, title, summary }) => ({ id, tag: t, title, summary }));
    return {
      content: [
        {
          type: "text",
          text: items.map((c) => `#${c.id} [${c.tag}] ${c.title} — ${c.summary}`).join("\n"),
        },
      ],
      structuredContent: { count: items.length, chunks: items },
    };
  },
});
