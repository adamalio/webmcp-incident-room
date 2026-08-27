import { z } from "zod";
import { checkoutIncident } from "../data/checkout-incident.ts";

export const inspectIncidentInputSchema = z
  .object({
    incidentId: z
      .literal(checkoutIncident.id)
      .describe("The canonical synthetic incident ID."),
  })
  .strict();

export const querySignalsInputSchema = z
  .object({
    incidentId: z.literal(checkoutIncident.id),
    signal: z.enum(["metrics", "traces", "logs"]),
    service: z.enum(checkoutIncident.services).optional(),
    limit: z.number().int().min(1).max(20),
  })
  .strict();

export const proposeMitigationInputSchema = z
  .object({
    incidentId: z.literal(checkoutIncident.id),
    mitigation: z.literal("restore_pricing_timeout"),
  })
  .strict();

export const toolErrorSchema = z
  .object({
    code: z.enum(["INVALID_INPUT", "INVALID_STATE", "INTERNAL_ERROR"]),
    message: z.string().max(160),
    retryable: z.boolean(),
    expectedState: z.string().max(40).optional(),
  })
  .strict();

export const inspectIncidentResultSchema = z
  .object({
    ok: z.literal(true),
    receiptId: z.literal("ins_001"),
    state: z.literal("investigating"),
    summary: z.literal(
      "Synthetic checkout impact is active across checkout-api and pricing.",
    ),
    data: z
      .object({
        impact: z
          .object({
            p95LatencyMs: z.literal(checkoutIncident.impact.p95LatencyMs),
            errorRatePercent: z.literal(
              checkoutIncident.impact.errorRatePercent,
            ),
            affectedSessions: z.literal(
              checkoutIncident.impact.affectedSessions,
            ),
            abandonedCheckouts: z.literal(
              checkoutIncident.impact.abandonedCheckouts,
            ),
            syntheticRevenueAtRiskUsd: z.literal(
              checkoutIncident.impact.syntheticRevenueAtRiskUsd,
            ),
          })
          .strict(),
        services: z
          .tuple([
            z.literal("edge"),
            z.literal("checkout-api"),
            z.literal("pricing"),
            z.literal("payments"),
            z.literal("orders-db"),
          ])
          .and(z.array(z.enum(checkoutIncident.services)).length(5)),
      })
      .strict(),
  })
  .strict();

export const toolFailureResultSchema = z
  .object({ ok: z.literal(false), error: toolErrorSchema })
  .strict();
