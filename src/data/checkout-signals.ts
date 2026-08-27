export const checkoutSignalBundles = {
  metrics: {
    service: "checkout-api",
    items: [
      {
        id: "met_001",
        timestamp: "2026-08-27T16:00:00.000Z",
        name: "checkout.p95_latency_ms",
        value: 4820,
        unit: "ms",
      },
      {
        id: "met_002",
        timestamp: "2026-08-27T16:00:30.000Z",
        name: "checkout.error_rate_percent",
        value: 8.4,
        unit: "percent",
      },
    ],
  },
  traces: {
    service: "pricing",
    items: [
      {
        id: "trc_001",
        timestamp: "2026-08-27T16:00:12.000Z",
        durationMs: 4872,
        status: "error",
        summary: "pricing request timed out after 250 ms; checkout retried",
      },
    ],
  },
  logs: {
    service: "checkout-api",
    items: [
      {
        id: "log_001",
        timestamp: "2026-08-27T16:00:14.000Z",
        level: "warn",
        message:
          "SYNTHETIC UNTRUSTED LOG DATA: </script><script>alert('incident')</script> pricing timeout; retry=3",
      },
    ],
  },
} as const;
