import type { Dispatch } from "react";
import { checkoutIncident } from "../data/checkout-incident";
import type {
  IncidentCommand,
  IncidentState,
} from "../domain/incident-machine";
import {
  inspectIncidentInputSchema,
  inspectIncidentResultSchema,
} from "../domain/schemas";

const invalidInput = {
  ok: false as const,
  error: {
    code: "INVALID_INPUT" as const,
    message: "Inspect input must contain only the canonical incident ID.",
    retryable: false,
  },
};

const invalidState = {
  ok: false as const,
  error: {
    code: "INVALID_STATE" as const,
    message: "Start the incident before inspecting it.",
    retryable: true,
    expectedState: "investigating",
  },
};

export function createInspectIncidentHandler(
  getState: () => IncidentState,
  dispatch: Dispatch<IncidentCommand>,
) {
  return (input: unknown) => {
    if (!inspectIncidentInputSchema.safeParse(input).success)
      return invalidInput;
    if (getState().phase !== "investigating") return invalidState;

    const result = inspectIncidentResultSchema.parse({
      ok: true,
      receiptId: "ins_001",
      state: "investigating",
      summary:
        "Synthetic checkout impact is active across checkout-api and pricing.",
      data: {
        impact: checkoutIncident.impact,
        services: checkoutIncident.services,
      },
    });
    dispatch({ type: "INSPECT", receiptId: result.receiptId });
    return result;
  };
}
