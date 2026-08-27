import { describe, expect, it } from "vitest";
import {
  createInitialIncidentState,
  incidentReducer,
} from "../../src/domain/incident-machine";

describe("start and inspect tracer", () => {
  it("starts only from idle", () => {
    const idle = createInitialIncidentState();
    const investigating = incidentReducer(idle, { type: "START" });

    expect(investigating.phase).toBe("investigating");
    expect(investigating.timeline).toHaveLength(1);

    const repeated = incidentReducer(investigating, { type: "START" });

    expect(repeated).toBe(investigating);
  });

  it("keeps a single visible event for repeated inspect receipts", () => {
    const investigating = incidentReducer(createInitialIncidentState(), {
      type: "START",
    });
    const inspected = incidentReducer(investigating, {
      type: "INSPECT",
      receiptId: "ins_001",
    });
    const repeated = incidentReducer(inspected, {
      type: "INSPECT",
      receiptId: "ins_001",
    });

    expect(repeated.timeline.map((event) => event.id)).toEqual([
      "evt_001",
      "evt_002",
    ]);
    expect(repeated.latestStatus).toBe("Incident inspected · ins_001");
  });

  it("preserves one inspect receipt when a query already owns the second event", () => {
    const investigating = incidentReducer(createInitialIncidentState(), {
      type: "START",
    });
    const queried = incidentReducer(investigating, {
      type: "QUERY",
      receiptId: "qry_001",
      queryKey: "metrics:checkout-api:2",
    });
    const inspected = incidentReducer(queried, {
      type: "INSPECT",
      receiptId: "ins_001",
    });
    const repeated = incidentReducer(inspected, {
      type: "INSPECT",
      receiptId: "ins_001",
    });

    expect(repeated.timeline.map((event) => event.receiptId)).toEqual([
      undefined,
      "qry_001",
      "ins_001",
    ]);
  });
});

describe("bounded signal tracer state", () => {
  it("preserves idle rejection history and advances logical time monotonically", () => {
    const rejected = incidentReducer(createInitialIncidentState(), {
      type: "QUERY_REJECTED",
      code: "INVALID_STATE",
    });
    const started = incidentReducer(rejected, { type: "START" });
    const queried = incidentReducer(started, {
      type: "QUERY",
      receiptId: "qry_001",
      queryKey: "metrics:checkout-api:2",
    });
    const inspected = incidentReducer(queried, {
      type: "INSPECT",
      receiptId: "ins_001",
    });

    expect(inspected.timeline.map((event) => event.label)).toEqual([
      "Signal query rejected · INVALID_STATE",
      "Investigation started",
      "Signals queried",
      "Incident inspected",
    ]);
    expect(inspected.timeline.map((event) => event.id)).toEqual([
      "evt_001",
      "evt_002",
      "evt_003",
      "evt_004",
    ]);
    const timestamps = inspected.timeline.map(({ timestamp }) =>
      Date.parse(timestamp),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(new Set(timestamps)).toHaveLength(timestamps.length);
  });

  it("appends ordered distinct queries and reuses a normalized semantic query", () => {
    const investigating = incidentReducer(createInitialIncidentState(), {
      type: "START",
    });
    const metrics = incidentReducer(investigating, {
      type: "QUERY",
      receiptId: "qry_001",
      queryKey: "metrics:checkout-api:2",
    });
    const repeated = incidentReducer(metrics, {
      type: "QUERY",
      receiptId: "qry_001",
      queryKey: "metrics:checkout-api:2",
    });
    const traces = incidentReducer(repeated, {
      type: "QUERY",
      receiptId: "qry_002",
      queryKey: "traces:pricing:1",
    });

    expect(traces.timeline.map(({ id, receiptId }) => [id, receiptId])).toEqual(
      [
        ["evt_001", undefined],
        ["evt_002", "qry_001"],
        ["evt_003", "qry_002"],
      ],
    );
    expect(traces.latestStatus).toBe("Signals queried · qry_002");
  });

  it("appends every safe query rejection without retaining raw input", () => {
    const investigating = incidentReducer(createInitialIncidentState(), {
      type: "START",
    });
    const invalidInput = incidentReducer(investigating, {
      type: "QUERY_REJECTED",
      code: "INVALID_INPUT",
    });
    const invalidState = incidentReducer(invalidInput, {
      type: "QUERY_REJECTED",
      code: "INVALID_STATE",
    });

    expect(invalidState.timeline).toEqual([
      investigating.timeline[0],
      {
        id: "evt_002",
        label: "Signal query rejected · INVALID_INPUT",
        timestamp: "2026-08-27T16:01:00.000Z",
      },
      {
        id: "evt_003",
        label: "Signal query rejected · INVALID_STATE",
        timestamp: "2026-08-27T16:02:00.000Z",
      },
    ]);
    expect(JSON.stringify(invalidState)).not.toContain("hostile");
  });
});
