import type { ReactNode } from "react";

export function SignalExplorer({
  evidence,
  onSelect,
}: {
  evidence: ReactNode;
  onSelect: (signal: "metrics" | "traces" | "logs") => void;
}) {
  const labels = { metrics: "Metrics", traces: "Traces", logs: "Logs" };
  return (
    <section className="timeline-card" aria-labelledby="signals-title">
      <p className="section-label">Synthetic signal evidence</p>
      <h2 id="signals-title">Signal explorer</h2>
      <div>
        {(["metrics", "traces", "logs"] as const).map((signal) => (
          <button
            key={signal}
            type="button"
            onClick={() => {
              onSelect(signal);
            }}
          >
            {labels[signal]}
          </button>
        ))}
      </div>
      <div aria-live="polite">{evidence}</div>
    </section>
  );
}
