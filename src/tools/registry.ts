import { z } from "zod";
import type { IncidentState } from "../domain/incident-machine";
import {
  inspectIncidentInputSchema,
  proposeMitigationInputSchema,
  querySignalsInputSchema,
} from "../domain/schemas";

export type ToolHandler = WebMCP.ToolExecuteCallback;

export type IncidentTool = WebMCP.ModelContextTool;

export interface ToolHandlers {
  inspect_incident: ToolHandler;
  query_signals: ToolHandler;
  propose_mitigation: ToolHandler;
}

const unavailable: ToolHandler = () => ({
  ok: false,
  error: {
    code: "INVALID_STATE",
    message:
      "This operation is not implemented in the start and inspect tracer.",
    retryable: false,
  },
});

export function getIncidentTools(
  phase: IncidentState["phase"],
  handlers: Partial<ToolHandlers>,
): IncidentTool[] {
  if (phase === "idle") return [];
  return [
    {
      name: "inspect_incident",
      description: "Inspect canonical synthetic incident impact and services.",
      inputSchema: z.toJSONSchema(inspectIncidentInputSchema),
      annotations: { readOnlyHint: true },
      execute: handlers.inspect_incident ?? unavailable,
    },
    {
      name: "query_signals",
      description: "Query bounded synthetic incident signals.",
      inputSchema: z.toJSONSchema(querySignalsInputSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: handlers.query_signals ?? unavailable,
    },
    {
      name: "propose_mitigation",
      description: "Propose the fixed synthetic mitigation for human review.",
      inputSchema: z.toJSONSchema(proposeMitigationInputSchema),
      execute: handlers.propose_mitigation ?? unavailable,
    },
  ];
}
