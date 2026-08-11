import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { QC_KNOWLEDGE } from "@/data/qc-knowledge";

export default defineTool({
  name: "get_qc_knowledge_chunk",
  title: "Get a quasicrystal knowledge chunk",
  description: "Fetch the full body of one quasicrystal knowledge chunk by its id.",
  inputSchema: { id: z.number().describe("Chunk id from list_qc_knowledge.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const chunk = QC_KNOWLEDGE.find((c) => c.id === id);
    if (!chunk) throw new ToolError(`No knowledge chunk with id ${id}.`);
    return {
      content: [{ type: "text", text: `[#${chunk.id} ${chunk.tag} — ${chunk.title}]\n${chunk.body}` }],
      structuredContent: chunk,
    };
  },
});
