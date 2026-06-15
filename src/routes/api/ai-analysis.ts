import { createFileRoute } from "@tanstack/react-router";

interface Body {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

export const Route = createFileRoute("/api/ai-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }
        try {
          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: body.messages,
              max_tokens: 400,
            }),
          });
          if (resp.status === 429)
            return Response.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
          if (resp.status === 402)
            return Response.json(
              { error: "AI credits exhausted. Add credits in Workspace → Usage." },
              { status: 402 },
            );
          if (!resp.ok) {
            const t = await resp.text();
            return Response.json({ error: `Gateway error: ${t.slice(0, 200)}` }, { status: 500 });
          }
          const data = (await resp.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { total_tokens?: number };
          };
          const content = data.choices?.[0]?.message?.content ?? "(empty)";
          const tokens = data.usage?.total_tokens ?? 0;
          return Response.json({ content, tokens });
        } catch (e) {
          return Response.json({ error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
