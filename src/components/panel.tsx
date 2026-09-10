import type { ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary ${className}`}
      aria-label="Loading"
    />
  );
}

export function Panel({
  title,
  subtitle,
  loading = false,
  actions,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`relative rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            {title}
            {loading && <Spinner />}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
