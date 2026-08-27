import { checkoutIncident } from "../data/checkout-incident";

export interface TimelineEvent {
  id: string;
  label: string;
  receiptId?: string;
  timestamp: string;
}

export type IncidentState =
  | { phase: "idle"; timeline: TimelineEvent[]; latestStatus: string }
  | {
      phase: "investigating";
      timeline: TimelineEvent[];
      latestStatus: string;
    };

export type IncidentCommand =
  | { type: "START" }
  | { type: "INSPECT"; receiptId: "ins_001" }
  | { type: "RESET" };

export function createInitialIncidentState(): IncidentState {
  return { phase: "idle", timeline: [], latestStatus: "Incident idle" };
}

export function incidentReducer(
  state: IncidentState,
  command: IncidentCommand,
): IncidentState {
  if (command.type === "RESET") return createInitialIncidentState();
  if (command.type === "START") {
    if (state.phase !== "idle") return state;
    return {
      phase: "investigating",
      latestStatus: "Investigation started",
      timeline: [
        {
          id: "evt_001",
          label: "Investigation started",
          timestamp: checkoutIncident.startedAt,
        },
      ],
    };
  }
  if (state.phase !== "investigating") return state;
  if (state.timeline.some((event) => event.id === "evt_002")) return state;
  return {
    ...state,
    latestStatus: `Incident inspected · ${command.receiptId}`,
    timeline: [
      ...state.timeline,
      {
        id: "evt_002",
        label: "Incident inspected",
        receiptId: command.receiptId,
        timestamp: "2026-08-27T16:01:00.000Z",
      },
    ],
  };
}
