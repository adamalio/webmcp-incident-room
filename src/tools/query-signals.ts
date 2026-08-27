import { checkoutSignalBundles } from "../data/checkout-signals";
import type {
  IncidentCommand,
  IncidentState,
  QueryReceiptId,
} from "../domain/incident-machine";
import {
  querySignalsInputSchema,
  querySignalsResultSchema,
} from "../domain/schemas";

const invalidInput = {
  ok: false as const,
  error: {
    code: "INVALID_INPUT" as const,
    message: "Query input must select one available bounded signal bundle.",
    retryable: false,
  },
};

const invalidState = {
  ok: false as const,
  error: {
    code: "INVALID_STATE" as const,
    message: "Start the incident before querying signals.",
    retryable: true,
    expectedState: "investigating",
  },
};

export function createQuerySignalsHandler(
  getState: () => IncidentState,
  dispatch: (command: IncidentCommand) => void,
) {
  return (input: unknown, options?: WebMCP.ToolExecuteCallbackOptions) => {
    const throwIfAborted = () => {
      if (!options?.signal.aborted) return;
      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new DOMException("Signal query aborted", "AbortError");
    };
    throwIfAborted();
    const parsed = querySignalsInputSchema.safeParse(input);
    throwIfAborted();
    if (!parsed.success) {
      dispatch({ type: "QUERY_REJECTED", code: "INVALID_INPUT" });
      return invalidInput;
    }
    const bundle = checkoutSignalBundles[parsed.data.signal];
    const state = getState();
    throwIfAborted();
    if (state.phase !== "investigating") {
      dispatch({ type: "QUERY_REJECTED", code: "INVALID_STATE" });
      return invalidState;
    }

    const items = bundle.items.slice(0, parsed.data.limit);
    const queryKey = `${parsed.data.signal}:${bundle.service}:${String(items.length)}`;
    const priorReceipt = state.queryReceipts[queryKey];
    const receiptId =
      priorReceipt ??
      (`qry_${String(Object.keys(state.queryReceipts).length + 1).padStart(3, "0")}` as QueryReceiptId);
    const result = querySignalsResultSchema.parse({
      ok: true,
      receiptId,
      state: "investigating",
      summary: `Returned ${String(items.length)} bounded synthetic ${parsed.data.signal} for ${bundle.service}.`,
      data: {
        signal: parsed.data.signal,
        service: bundle.service,
        items,
      },
    });
    throwIfAborted();
    dispatch({
      type: "QUERY",
      receiptId: result.receiptId,
      queryKey,
    });
    return result;
  };
}
