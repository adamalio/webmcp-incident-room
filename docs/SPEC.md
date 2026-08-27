# WebMCP Incident Room Product Specification

## Outcome

Ship a public, hosted, open-source WebMCP application before September 3, 2026 at 13:00 PT. It must demonstrate a reliable human-agent incident response workflow in less than three minutes and score strongly on WebMCP leverage, execution, impact, and creativity.

## User story

An on-call engineer opens a simulated incident affecting a checkout service. The page presents a topology, service health, traces, metrics, logs, customer impact, and a visible incident timeline. The engineer asks a WebMCP-capable browser agent to investigate. The agent uses narrow structured tools to gather evidence, prepares a reversible mitigation, waits for visible human approval, applies the synthetic change, verifies recovery, and can roll it back.

## Core workflow

1. Start one deterministic incident scenario.
2. Agent calls `inspect_incident` to retrieve current impact and service state.
3. Agent calls `query_signals` to retrieve bounded metrics, traces, or log evidence.
4. Agent calls `propose_mitigation` to create a visible uncommitted plan and receipt.
5. Human reviews and confirms through a visible declarative WebMCP-enabled form.
6. Agent calls `apply_mitigation` only after approval is present.
7. Agent calls `verify_recovery` to compare before and after health.
8. Agent can call `rollback_mitigation` to restore the previous synthetic state.
9. When recovery is verified, the page exposes `generate_postmortem` and removes tools that are no longer relevant.

## Required WebMCP proof

- Use `document.modelContext.registerTool` for imperative tools.
- Use declarative form annotations for at least the confirmation action.
- Register and unregister tools according to application state.
- Attach `readOnlyHint` to read tools and `untrustedContentHint` to log-bearing output.
- Use runtime validation in addition to JSON Schema.
- Keep tool names under 30 characters, descriptions under 500 characters, parameter descriptions under 150 characters, and outputs under 1,500 characters.
- Update the visible page state after each invocation.
- Return compact receipts with stable IDs for follow-up calls.
- Support unsupported browsers without breaking the human UI.

## Safety boundaries

- No real infrastructure, credentials, customer data, or external mutations.
- Logs are synthetic and explicitly untrusted.
- Read-only inspection can run without confirmation.
- Proposals do not mutate incident state.
- Applying a mitigation requires a matching, unexpired, visible approval receipt.
- Every applied mitigation is reversible.
- Invalid ordering, stale IDs, repeated calls, malformed parameters, and unauthorized writes fail with clear machine-readable errors.

## Product scope

### In scope

- One primary checkout latency incident with a deterministic root cause.
- Optional second scenario only after the primary journey is flawless.
- Responsive desktop and mobile human UI.
- A service topology, impact summary, signal explorer, mitigation review, incident timeline, and proof receipt.
- Browser-local persistence or deterministic state reset.
- Automated deterministic tests and a small model-facing eval dataset.
- Public live deployment with no authentication.

### Out of scope

- Real cloud provider integrations.
- Real incident paging, credentials, APIs, or databases.
- Multi-user collaboration.
- Full observability product breadth.
- A general chatbot or custom model backend.
- More than one submission.

## Design read

A developer operations product for technical judges. The interface should feel serious, fast, high-trust, and cinematic enough for a three-minute demo. Use a restrained dark operations palette with one warm incident accent, clear typography, semantic status color, tactile state transitions, reduced-motion support, and no generic AI gradients or decorative clutter.

## Acceptance criteria

- Fresh install succeeds from README instructions.
- Production build succeeds without warnings or type errors.
- All deterministic tests pass.
- The primary journey completes from reset to verified recovery.
- A write without approval is blocked and tested.
- A stale or wrong receipt is blocked and tested.
- Rollback restores the exact prior state and is tested.
- Registered tools match the current state and are tested.
- The live URL works without credentials.
- A WebMCP-capable browser discovers and invokes the tools.
- The repository is public, licensed, and has no secrets.
- The final demo is public on YouTube, has audio, and is shorter than three minutes.
