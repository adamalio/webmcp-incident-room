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
});
