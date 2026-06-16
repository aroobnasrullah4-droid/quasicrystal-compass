import { useEffect, useRef, useState } from "react";

interface AIProps {
  comp: { Al: number; Cu: number; Fe: number; Mn: number };
  phase: string;
  confidence: number;
  e_a: number;
  stabilityPassed: number;
  api: number;
}

const SYSTEM_PROMPT = `You are a materials science expert specializing in quasicrystalline alloys, specifically Al-Cu-Fe-Mn systems. You have deep knowledge of:
- Quasicrystal phase formation rules
- Hume-Rothery electron concentration
- CNT growth via CVD on QC catalysts
- Ali et al. (2025) on AlCuFeMn QC + CNT antibacterial systems
- The HYPOD-X database and ML prediction approaches

When given a composition, provide:
1. A scientific assessment of QC formation likelihood (2-3 sentences)
2. Key concerns or favorable factors
3. What to expect after leaching and CVD
4. One specific experimental recommendation

Keep response under 150 words. Be direct and scientific.`;

const COOLDOWN_MS = 10_000;

type Msg = { role: "system" | "user" | "assistant"; content: string };

export function AIAnalysis({ comp, phase, confidence, e_a, stabilityPassed, api }: AIProps) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const [lastCall, setLastCall] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const triggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const initialUserMsg = `Analyze this Al-Cu-Fe-Mn composition for quasicrystal formation:
Al: ${comp.Al.toFixed(1)}%, Cu: ${comp.Cu.toFixed(1)}%, Fe: ${comp.Fe.toFixed(1)}%, Mn: ${comp.Mn.toFixed(1)}%
e/a ratio: ${e_a.toFixed(3)}
Rule-based prediction: ${phase} (${confidence.toFixed(0)}% confidence)
Stability score: ${stabilityPassed}/4 rules passed
Antibacterial index: ${api.toFixed(1)}/10

Provide expert scientific assessment.`;

  const callAI = async (newUser: string) => {
    const now = Date.now();
    if (now - lastCall < COOLDOWN_MS) {
      setCooldown(Math.ceil((COOLDOWN_MS - (now - lastCall)) / 1000));
      return;
    }
    setLastCall(now);
    setCooldown(10);
    setLoading(true);
    setError(null);

    const messages: Msg[] =
      history.length === 0
        ? [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: newUser },
          ]
        : [...history, { role: "user", content: newUser }];

    try {
      const resp = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? `Error ${resp.status}`);
      } else {
        setHistory([...messages, { role: "assistant", content: data.content }]);
        setTokens((t) => t + (data.tokens ?? 0));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  triggerRef.current = () => void callAI(initialUserMsg);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && e.shiftKey) {
        e.preventDefault();
        triggerRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const lastResponse = [...history].reverse().find((m) => m.role === "assistant")?.content;

  const followUps = [
    { label: "Suggest experimental validation pathway", text: "Suggest an experimental validation pathway for this composition." },
    { label: "Analyze Mn concentration effects", text: "Analyze how the Mn concentration of this composition affects QC formation." },
    { label: "Compare with Ali et al. (2025) system", text: "Compare this composition to the Al63Cu18Fe12Mn7 system from Ali et al. (2025)." },
  ];

  return (
    <div className="mt-3 rounded-md border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => void callAI(initialUserMsg)}
          disabled={loading || cooldown > 0}
          className="rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
          title="Ctrl+Shift+A"
        >
          {loading ? "🧠 Analyzing..." : "🤖 Ask AI for Analysis"}
        </button>
        {cooldown > 0 && (
          <span className="text-[10px] text-muted-foreground">Cooldown: {cooldown}s</span>
        )}
      </div>

      {error && (
        <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {lastResponse && (
        <div className="mt-3 rounded border-l-4 border-sky-400 bg-sky-500/5 p-3">
          <div className="mb-1 text-xs font-semibold text-sky-300">🤖 AI Scientific Analysis</div>
          <div className="whitespace-pre-wrap text-sm italic text-foreground/90">{lastResponse}</div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Powered by Lovable AI (Gemini) — for research guidance only
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {followUps.map((f) => (
              <button
                key={f.label}
                onClick={() => void callAI(f.text)}
                disabled={loading || cooldown > 0}
                className="rounded border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-muted-foreground">Tokens used: {tokens}</div>
    </div>
  );
}
