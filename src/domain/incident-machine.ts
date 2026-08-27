import { checkoutIncident } from "../data/checkout-incident";

export interface TimelineEvent {
  id: string;
  label: string;
  receiptId?: string;
  timestamp: string;
}

export type QueryReceiptId = "qry_001" | "qry_002" | "qry_003" | "qry_004";

interface IncidentStateBase {
  timeline: TimelineEvent[];
  latestStatus: string;
  queryReceipts: Record<string, QueryReceiptId>;
}

export type IncidentState =
  | ({ phase: "idle" } & IncidentStateBase)
  | ({
      phase: "investigating";
    } & IncidentStateBase);

export type IncidentCommand =
  | { type: "START" }
  | { type: "INSPECT"; receiptId: "ins_001" }
  | { type: "QUERY"; receiptId: QueryReceiptId; queryKey: string }
  | { type: "QUERY_REJECTED"; code: "INVALID_INPUT" | "INVALID_STATE" }
  | { type: "RESET" };

export function createInitialIncidentState(): IncidentState {
  return {
    phase: "idle",
    timeline: [],
    latestStatus: "Incident idle",
    queryReceipts: {},
  };
}

function nextEvent(state: IncidentState, label: string, receiptId?: string) {
  const ordinal = state.timeline.length + 1;
  const previousTimestamp = state.timeline.at(-1)?.timestamp;
  return {
    id: `evt_${String(ordinal).padStart(3, "0")}`,
    label,
    ...(receiptId ? { receiptId } : {}),
    timestamp: previousTimestamp
      ? new Date(Date.parse(previousTimestamp) + 60_000).toISOString()
      : checkoutIncident.startedAt,
  };
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
      queryReceipts: {},
      timeline: [...state.timeline, nextEvent(state, "Investigation started")],
    };
  }
  if (command.type === "QUERY_REJECTED") {
    const label = `Signal query rejected · ${command.code}`;
    return {
      ...state,
      latestStatus: label,
      timeline: [...state.timeline, nextEvent(state, label)],
    };
  }
  if (state.phase !== "investigating") return state;
  if (command.type === "QUERY") {
    if (state.queryReceipts[command.queryKey]) return state;
    return {
      ...state,
      latestStatus: `Signals queried · ${command.receiptId}`,
      queryReceipts: {
        ...state.queryReceipts,
        [command.queryKey]: command.receiptId,
      },
      timeline: [
        ...state.timeline,
        nextEvent(state, "Signals queried", command.receiptId),
      ],
    };
  }
  if (state.timeline.some((event) => event.receiptId === command.receiptId))
    return state;
  return {
    ...state,
    latestStatus: `Incident inspected · ${command.receiptId}`,
    timeline: [
      ...state.timeline,
      nextEvent(state, "Incident inspected", command.receiptId),
    ],
  };
}
