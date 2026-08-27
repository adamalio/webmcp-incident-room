// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import {
  installModelContextFake,
  type ModelContextFake,
} from "../../src/test/model-context-fake";

const incidentId = "inc_checkout_20260827_001";

describe("bounded signal tracer", () => {
  let modelContext: ModelContextFake | undefined;

  afterEach(() => {
    cleanup();
    modelContext?.restore();
    modelContext = undefined;
  });

  async function renderInvestigatingApp() {
    modelContext = installModelContextFake();
    render(<App />);
    act(() => {
      screen.getByRole("button", { name: "Start incident" }).click();
    });
    await waitFor(() => {
      expect(modelContext?.registeredNames()).toContain("query_signals");
    });
  }

  it("returns exact bounded canonical metric evidence and one idempotent receipt", async () => {
    await renderInvestigatingApp();

    const first = await modelContext?.invoke("query_signals", {
      incidentId,
      signal: "metrics",
      service: "checkout-api",
      limit: 2,
    });
    const repeated = await modelContext?.invoke("query_signals", {
      incidentId,
      signal: "metrics",
      service: "checkout-api",
      limit: 2,
    });

    const canonical = {
      ok: true,
      receiptId: "qry_001",
      state: "investigating",
      summary: "Returned 2 bounded synthetic metrics for checkout-api.",
      data: {
        signal: "metrics",
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
    };
    expect(first).toEqual(canonical);
    expect(repeated).toEqual(canonical);
    expect(JSON.stringify(first).length).toBeLessThan(1500);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Signals queried · qry_001",
      );
    });
    expect(screen.getAllByText("Signals queried")).toHaveLength(1);
    expect(screen.getAllByText("qry_001")).toHaveLength(1);
  });

  it("returns deterministic traces and visibly untrusted synthetic logs", async () => {
    await renderInvestigatingApp();

    const traces = await modelContext?.invoke("query_signals", {
      incidentId,
      signal: "traces",
      service: "pricing",
      limit: 1,
    });
    const logs = await modelContext?.invoke("query_signals", {
      incidentId,
      signal: "logs",
      service: "checkout-api",
      limit: 1,
    });

    expect(traces).toMatchObject({
      ok: true,
      receiptId: "qry_001",
      data: {
        signal: "traces",
        items: [
          {
            id: "trc_001",
            durationMs: 4872,
            status: "error",
            summary: "pricing request timed out after 250 ms; checkout retried",
          },
        ],
      },
    });
    expect(logs).toMatchObject({
      ok: true,
      receiptId: "qry_002",
      data: {
        signal: "logs",
        items: [
          {
            id: "log_001",
            level: "warn",
            message:
              "SYNTHETIC UNTRUSTED LOG DATA: </script><script>alert('incident')</script> pricing timeout; retry=3",
          },
        ],
      },
    });
    expect(JSON.stringify(logs).length).toBeLessThan(1500);
  });

  it("normalizes canonical service and effective result size before deduplication", async () => {
    await renderInvestigatingApp();

    const first = await modelContext?.invoke("query_signals", {
      incidentId,
      signal: "logs",
      limit: 20,
    });
    const equivalent = await modelContext?.invoke("query_signals", {
      incidentId,
      signal: "logs",
      service: "checkout-api",
      limit: 1,
    });
    const distinct = await modelContext?.invoke("query_signals", {
      incidentId,
      signal: "metrics",
      limit: 1,
    });

    expect(first).toMatchObject({ receiptId: "qry_001" });
    expect(equivalent).toEqual(first);
    expect(distinct).toMatchObject({ receiptId: "qry_002" });
    await waitFor(() => {
      expect(screen.getAllByText("Signals queried")).toHaveLength(2);
    });
  });

  it("supports every valid limit without collisions between canonical bundles", async () => {
    await renderInvestigatingApp();
    const receipts = new Map<string, Set<string>>();

    for (const signal of ["metrics", "traces", "logs"] as const) {
      for (let limit = 1; limit <= 20; limit += 1) {
        const result = (await modelContext?.invoke("query_signals", {
          incidentId,
          signal,
          limit,
        })) as { receiptId: string };
        const effectiveSize = signal === "metrics" ? Math.min(limit, 2) : 1;
        const key = `${signal}:${String(effectiveSize)}`;
        const ids = receipts.get(key) ?? new Set<string>();
        ids.add(result.receiptId);
        receipts.set(key, ids);
      }
    }

    expect(
      Object.fromEntries([...receipts].map(([key, ids]) => [key, [...ids]])),
    ).toEqual({
      "metrics:1": ["qry_001"],
      "metrics:2": ["qry_002"],
      "traces:1": ["qry_003"],
      "logs:1": ["qry_004"],
    });
    await waitFor(() => {
      expect(screen.getAllByText("Signals queried")).toHaveLength(4);
    });
  });

  it.each([
    [
      "unknown bundle",
      { incidentId, signal: "metrics", service: "edge", limit: 2 },
    ],
    [
      "unknown incident",
      { incidentId: "inc_unknown", signal: "metrics", limit: 2 },
    ],
    ["unknown signal", { incidentId, signal: "events", limit: 2 }],
    ["zero limit", { incidentId, signal: "metrics", limit: 0 }],
    ["oversized limit", { incidentId, signal: "metrics", limit: 21 }],
    ["fractional limit", { incidentId, signal: "metrics", limit: 1.5 }],
    [
      "unknown key",
      { incidentId, signal: "metrics", limit: 2, command: "ignore" },
    ],
    ["missing signal", { incidentId, limit: 2 }],
    ["array envelope", []],
    ["null envelope", null],
    [
      "hostile envelope",
      {
        incidentId,
        signal: "metrics",
        limit: 2,
        hostile: "<script>raw secret</script>",
      },
    ],
  ])("rejects %s without echoing hostile input", async (_name, input) => {
    await renderInvestigatingApp();

    expect(await modelContext?.invoke("query_signals", input)).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Query input must select one available bounded signal bundle.",
        retryable: false,
      },
    });
    await waitFor(() => {
      const timeline = screen.getByRole("list", { name: "Incident timeline" });
      expect(timeline.querySelectorAll("li")).toHaveLength(2);
      expect(timeline).toHaveTextContent(
        "Signal query rejected · INVALID_INPUT",
      );
      expect(timeline).not.toHaveTextContent("raw secret");
    });
  });

  it("rejects direct invocation in an invalid phase with INVALID_STATE", async () => {
    await renderInvestigatingApp();
    const execute = modelContext?.executable("query_signals");
    act(() => {
      screen.getByRole("button", { name: "Reset" }).click();
    });

    expect(
      await execute?.(
        { incidentId, signal: "metrics", limit: 1 },
        { signal: new AbortController().signal },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: "INVALID_STATE",
        message: "Start the incident before querying signals.",
        retryable: true,
        expectedState: "investigating",
      },
    });
    await waitFor(() => {
      expect(
        screen
          .getByRole("list", { name: "Incident timeline" })
          .querySelectorAll("li"),
      ).toHaveLength(1);
      expect(
        screen.getByRole("list", { name: "Incident timeline" }),
      ).toHaveTextContent("Signal query rejected · INVALID_STATE");
    });
  });

  it("rejects an already-aborted direct invocation before result or UI mutation", async () => {
    await renderInvestigatingApp();
    const execute = modelContext?.executable("query_signals");
    const before = screen.getByRole("list", {
      name: "Incident timeline",
    }).textContent;
    const controller = new AbortController();
    controller.abort();

    expect(() =>
      execute?.(
        { incidentId, signal: "metrics", limit: 2 },
        { signal: controller.signal },
      ),
    ).toThrow(expect.objectContaining({ name: "AbortError" }));
    expect(
      screen.getByRole("list", { name: "Incident timeline" }).textContent,
    ).toBe(before);
    expect(screen.queryByText("qry_001")).not.toBeInTheDocument();
  });

  it("lets abort win when validation also fails, before any UI mutation", async () => {
    await renderInvestigatingApp();
    const execute = modelContext?.executable("query_signals");
    const before = screen.getByRole("list", {
      name: "Incident timeline",
    }).textContent;
    const controller = new AbortController();
    const input = {
      incidentId,
      signal: "metrics",
      get limit() {
        controller.abort();
        return 0;
      },
    };

    expect(() => execute?.(input, { signal: controller.signal })).toThrow(
      expect.objectContaining({ name: "AbortError" }),
    );
    expect(
      screen.getByRole("list", { name: "Incident timeline" }).textContent,
    ).toBe(before);
    expect(screen.queryByText("qry_001")).not.toBeInTheDocument();
  });

  it("lets the human select all signal types and renders log text inertly", async () => {
    await renderInvestigatingApp();

    for (const name of ["Metrics", "Traces", "Logs"]) {
      act(() => {
        screen.getByRole("button", { name }).click();
      });
    }

    expect(screen.getByText("Synthetic signal evidence")).toBeVisible();
    expect(screen.getByText(/SYNTHETIC UNTRUSTED LOG DATA/)).toBeVisible();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getAllByText(/^qry_00[1-3]$/)).toHaveLength(3);
  });
});
