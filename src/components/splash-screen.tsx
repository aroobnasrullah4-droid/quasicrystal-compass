import { useEffect, useState } from "react";

export function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1600);
    const t2 = setTimeout(() => setHidden(true), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <svg viewBox="0 0 100 100" className="h-24 w-24 text-sky-400" style={{ animation: "spin 4s linear infinite" }}>
        <polygon
          points="50,5 67,20 90,25 78,48 95,67 70,72 60,95 50,75 40,95 30,72 5,67 22,48 10,25 33,20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <polygon
          points="50,20 62,30 75,38 65,55 75,70 55,68 50,82 45,68 25,70 35,55 25,38 38,30"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">QC Phase Predictor</h1>
      <p className="mt-1 text-sm text-muted-foreground">PIEAS MME FYP 2025-26</p>
      <div className="mt-6 h-1 w-48 overflow-hidden rounded bg-muted">
        <div className="h-full bg-sky-400" style={{ animation: "splashBar 1.6s ease-out forwards" }} />
      </div>
      <style>{`
        @keyframes splashBar { from { width: 0%; } to { width: 100%; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
