import { z } from "zod";
import { checkoutIncident } from "../data/checkout-incident.ts";

export const inspectIncidentInputSchema = z
  .object({
    incidentId: z
      .literal(checkoutIncident.id)
      .describe("The canonical synthetic incident ID."),
  })
  .strict();

const querySignalsInputBase = {
  incidentId: z
    .literal(checkoutIncident.id)
    .describe("The canonical synthetic incident ID."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .describe("Maximum evidence rows to return, from 1 through 20."),
};

export const querySignalsInputSchema = z.discriminatedUnion("signal", [
  z
    .object({
      ...querySignalsInputBase,
      signal: z.literal("metrics"),
      service: z.literal("checkout-api").optional(),
    })
    .strict(),
  z
    .object({
      ...querySignalsInputBase,
      signal: z.literal("traces"),
      service: z.literal("pricing").optional(),
    })
    .strict(),
  z
    .object({
      ...querySignalsInputBase,
      signal: z.literal("logs"),
      service: z.literal("checkout-api").optional(),
    })
    .strict(),
]);

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

const metricLatencyItemSchema = z
  .object({
    id: z.literal("met_001"),
    timestamp: z.literal("2026-08-27T16:00:00.000Z"),
    name: z.literal("checkout.p95_latency_ms"),
    value: z.literal(4820),
    unit: z.literal("ms"),
  })
  .strict();

const metricErrorItemSchema = z
  .object({
    id: z.literal("met_002"),
    timestamp: z.literal("2026-08-27T16:00:30.000Z"),
    name: z.literal("checkout.error_rate_percent"),
    value: z.literal(8.4),
    unit: z.literal("percent"),
  })
  .strict();

const traceItemSchema = z
  .object({
    id: z.literal("trc_001"),
    timestamp: z.literal("2026-08-27T16:00:12.000Z"),
    durationMs: z.literal(4872),
    status: z.literal("error"),
    summary: z.literal(
      "pricing request timed out after 250 ms; checkout retried",
    ),
  })
  .strict();

const logItemSchema = z
  .object({
    id: z.literal("log_001"),
    timestamp: z.literal("2026-08-27T16:00:14.000Z"),
    level: z.literal("warn"),
    message: z.literal(
      "SYNTHETIC UNTRUSTED LOG DATA: </script><script>alert('incident')</script> pricing timeout; retry=3",
    ),
  })
  .strict();

const queryResultBase = {
  ok: z.literal(true),
  receiptId: z.enum(["qry_001", "qry_002", "qry_003", "qry_004"]),
  state: z.literal("investigating"),
  summary: z.string().min(1).max(100),
};

export const querySignalsResultSchema = z.union([
  z
    .object({
      ...queryResultBase,
      data: z
        .object({
          signal: z.literal("metrics"),
          service: z.literal("checkout-api"),
          items: z.union([
            z.tuple([metricLatencyItemSchema]).rest(z.never()),
            z
              .tuple([metricLatencyItemSchema, metricErrorItemSchema])
              .rest(z.never()),
          ]),
        })
        .strict(),
      summary: z.enum([
        "Returned 1 bounded synthetic metrics for checkout-api.",
        "Returned 2 bounded synthetic metrics for checkout-api.",
      ]),
    })
    .strict(),
  z
    .object({
      ...queryResultBase,
      data: z
        .object({
          signal: z.literal("traces"),
          service: z.literal("pricing"),
          items: z.array(traceItemSchema).length(1),
        })
        .strict(),
      summary: z.literal("Returned 1 bounded synthetic traces for pricing."),
    })
    .strict(),
  z
    .object({
      ...queryResultBase,
      data: z
        .object({
          signal: z.literal("logs"),
          service: z.literal("checkout-api"),
          items: z.array(logItemSchema).length(1),
        })
        .strict(),
      summary: z.literal("Returned 1 bounded synthetic logs for checkout-api."),
    })
    .strict(),
]);

export const toolFailureResultSchema = z
  .object({ ok: z.literal(false), error: toolErrorSchema })
  .strict();
