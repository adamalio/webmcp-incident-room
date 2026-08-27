export const checkoutIncident = {
  id: "inc_checkout_20260827_001",
  title: "Checkout latency incident",
  startedAt: "2026-08-27T16:00:00.000Z",
  status: "Idle",
  simulationLabel: "Synthetic incident simulation",
  impact: {
    p95LatencyMs: 4820,
    errorRatePercent: 8.4,
    affectedSessions: 1284,
    abandonedCheckouts: 312,
    syntheticRevenueAtRiskUsd: 46800,
  },
  services: ["edge", "checkout-api", "pricing", "payments", "orders-db"],
} as const;
