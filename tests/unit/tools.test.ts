import { describe, expect, it, vi } from "vitest";
import { createInspectIncidentHandler } from "../../src/tools/inspect-incident";
import {
  createInitialIncidentState,
  incidentReducer,
  type IncidentCommand,
} from "../../src/domain/incident-machine";
import type { Dispatch } from "react";
import { getIncidentTools } from "../../src/tools/registry";

describe("start and inspect tracer", () => {
  it("returns the INVALID_STATE envelope when inspection is idle", () => {
    const handler = createInspectIncidentHandler(
      createInitialIncidentState,
      vi.fn(),
    );

    expect(handler({ incidentId: "inc_checkout_20260827_001" })).toEqual({
      ok: false,
      error: {
        code: "INVALID_STATE",
        message: "Start the incident before inspecting it.",
        retryable: true,
        expectedState: "investigating",
      },
    });
  });

  it("returns the INVALID_INPUT envelope for malformed inspection input", () => {
    const handler = createInspectIncidentHandler(
      () => incidentReducer(createInitialIncidentState(), { type: "START" }),
      vi.fn(),
    );

    expect(handler({ incidentId: 42, extra: true })).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Inspect input must contain only the canonical incident ID.",
        retryable: false,
      },
    });
  });

  it("returns bounded canonical impact from the inspect handler", () => {
    let state = incidentReducer(createInitialIncidentState(), {
      type: "START",
    });
    const dispatch: Dispatch<IncidentCommand> = vi.fn(
      (command: IncidentCommand) => {
        state = incidentReducer(state, command);
      },
    );
    const handler = createInspectIncidentHandler(() => state, dispatch);

    const result = handler({
      incidentId: "inc_checkout_20260827_001",
    });

    expect(result).toMatchObject({
      ok: true,
      receiptId: "ins_001",
      state: "investigating",
      data: {
        impact: {
          p95LatencyMs: 4820,
          errorRatePercent: 8.4,
          affectedSessions: 1284,
          abandonedCheckouts: 312,
          syntheticRevenueAtRiskUsd: 46800,
        },
      },
    });
    expect(JSON.stringify(result).length).toBeLessThan(1500);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("exposes exactly the three investigating tools without Tracer 2 query annotations", () => {
    const tools = getIncidentTools("investigating", {});

    expect(tools.map((tool) => tool.name)).toEqual([
      "inspect_incident",
      "query_signals",
      "propose_mitigation",
    ]);
    expect(
      tools.find((tool) => tool.name === "query_signals")?.annotations,
    ).toBe(undefined);
    const executionOptions = { signal: new AbortController().signal };
    expect(
      tools
        .find((tool) => tool.name === "query_signals")
        ?.execute({}, executionOptions),
    ).toMatchObject({ ok: false });
    expect(
      tools
        .find((tool) => tool.name === "propose_mitigation")
        ?.execute({}, executionOptions),
    ).toMatchObject({ ok: false });
  });
});
