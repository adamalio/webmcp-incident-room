# WebMCP Incident Room implementation plan

Date: 2026-08-27

Target submission deadline: 2026-09-03 13:00 PT

Plan status: implementation not started

## Outcome and non-negotiable scope

Build a public, static Netlify-hosted Vite + React + TypeScript application in which a human and a WebMCP-capable browser agent resolve one deterministic checkout-latency incident. The primary journey must be polished, deterministic, reversible, and finish in under three minutes:

1. Reset/start the checkout incident.
2. Inspect its impact and service state.
3. Query bounded metrics, traces, and synthetic logs.
4. Propose one safe mitigation and show its receipt.
5. Obtain explicit human approval through a visible declarative WebMCP form.
6. Apply only the approved, matching, unexpired mitigation.
7. Verify recovery against the frozen baseline.
8. Optionally roll back to the exact pre-change state.
9. Generate a postmortem only after verified recovery.

Do not add a second incident, remote backend, chatbot, authentication, live observability, or real infrastructure integration until every primary-journey acceptance test and the three-minute rehearsal pass. If schedule remains after freeze, a secondary scenario requires a separate plan and must not alter primary data, transitions, tools, layout, or demo timing.

## Reference constraints

- Treat the official Cloudflare WebMCP material as an API-shape reference only; do not clone, import, copy, deploy, or inherit its starter architecture. Record the exact URL, commit/release, and access date in `docs/REFERENCES.md` during implementation.
- Use the current standards-facing producer surface, `document.modelContext.registerTool(tool, { signal })`; own each registration with an `AbortController` and abort it to unregister. Never depend on removed/non-standard `unregisterTool`, `provideContext`, `clearContext`, or `navigator.modelContext` APIs.
- Keep the WebMCP draft behind `src/webmcp/model-context.ts` so an API change touches one adapter.
- Implement the confirmation as ordinary accessible HTML first, enhanced with the declarative attributes `toolname`, `tooldescription`, `toolautosubmit`, and `toolparamdescription`. Do not replace the human submit path with an imperative tool.
- Use native `document.modelContext` in the manual verification lane. Tests may inject a contract-faithful fake; do not ship a polyfill that makes unsupported browsers appear supported.

## Technology and package baseline

- Node.js 22 LTS, npm, committed `package-lock.json`, and an `engines.node` constraint.
- Vite, React, React DOM, strict TypeScript, and CSS modules or plain colocated CSS (no runtime CSS framework required).
- Zod as the single runtime contract source and `zod-to-json-schema` (or the current maintained Zod-native equivalent selected and pinned before implementation) to generate JSON Schema.
- Vitest + jsdom + Testing Library + `@testing-library/user-event` + `@testing-library/jest-dom`.
- Playwright with Chromium, Firefox, and WebKit for human UI; a separate Chromium/native-WebMCP manual or supported headed lane for genuine discovery and invocation.
- ESLint with TypeScript and React rules, Prettier, and `tsc --noEmit`.
- Netlify static hosting only. No Functions, Edge Functions, Workers, credentials, database, or external writes.

Initial scaffold commands (run only when implementation begins):

```bash
npm create vite@latest . -- --template react-ts
npm install zod zod-to-json-schema
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test eslint prettier
npx playwright install --with-deps chromium firefox webkit
```

Before accepting dependency versions, run `npm view <package> version`, pin exact versions in `package.json`, commit the lockfile, and document any API-version choice. The finished command surface must be:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run test:schemas
npm run build
npm run preview -- --host 127.0.0.1
```

## Exact repository shape

```text
.
├── .github/workflows/ci.yml
├── .gitignore
├── LICENSE
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BROWSER-VERIFICATION.md
│   ├── DEMO.md
│   ├── EVALUATION.md
│   ├── REFERENCES.md
│   ├── SECURITY.md
│   ├── SPEC.md
│   ├── SUBMISSION.md
│   └── plans/2026-08-27-webmcp-incident-room.md
├── evals/
│   ├── cases.json
│   └── cases.schema.json
├── index.html
├── netlify.toml
├── package.json
├── package-lock.json
├── playwright.config.ts
├── public/
│   ├── favicon.svg
│   ├── og-card.png
│   └── video/
│       ├── poster.png
│       └── README.md
├── scripts/
│   ├── check-generated-schemas.mjs
│   └── generate-schemas.mjs
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── app.css
│   ├── components/
│   │   ├── ApprovalForm.tsx
│   │   ├── BrowserCapabilityBanner.tsx
│   │   ├── CustomerImpact.tsx
│   │   ├── IncidentHeader.tsx
│   │   ├── IncidentTimeline.tsx
│   │   ├── MitigationPanel.tsx
│   │   ├── ProofReceipt.tsx
│   │   ├── ServiceTopology.tsx
│   │   ├── SignalExplorer.tsx
│   │   └── StatusLegend.tsx
│   ├── domain/
│   │   ├── commands.ts
│   │   ├── errors.ts
│   │   ├── ids.ts
│   │   ├── incident-machine.ts
│   │   ├── incident-state.ts
│   │   ├── receipts.ts
│   │   ├── schemas.ts
│   │   └── selectors.ts
│   ├── data/
│   │   ├── checkout-incident.ts
│   │   └── checkout-signals.ts
│   ├── persistence/
│   │   └── incident-storage.ts
│   ├── schemas/generated/
│   │   ├── tool-inputs.schema.json
│   │   └── tool-results.schema.json
│   ├── test/
│   │   ├── fixtures.ts
│   │   ├── model-context-fake.ts
│   │   └── setup.ts
│   ├── tools/
│   │   ├── apply-mitigation.ts
│   │   ├── generate-postmortem.ts
│   │   ├── inspect-incident.ts
│   │   ├── propose-mitigation.ts
│   │   ├── query-signals.ts
│   │   ├── registry.ts
│   │   ├── rollback-mitigation.ts
│   │   ├── tool-result.ts
│   │   └── verify-recovery.ts
│   ├── webmcp/
│   │   ├── model-context.ts
│   │   ├── types.d.ts
│   │   └── useIncidentTools.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/
│   ├── e2e/
│   │   ├── accessibility.spec.ts
│   │   ├── primary-journey.spec.ts
│   │   ├── responsive.spec.ts
│   │   └── unsupported-browser.spec.ts
│   ├── integration/
│   │   ├── approval-form.test.tsx
│   │   ├── app-primary-journey.test.tsx
│   │   ├── persistence.test.tsx
│   │   └── tool-lifecycle.test.tsx
│   └── unit/
│       ├── incident-machine.test.ts
│       ├── schemas.test.ts
│       └── tools.test.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

Generated schema files are committed for inspection but never hand-edited. Video source/project files remain outside the deployed bundle; only the lightweight poster and an asset manifest/instructions file belong in `public/video/`. Add the public YouTube URL to `README.md` and `docs/SUBMISSION.md` after upload.

## Architecture and ownership

Use one-way data flow and keep browser APIs at the edge:

```text
React UI + declarative approval form
              │ dispatches typed commands
              ▼
pure incident reducer/state machine ──► deterministic next state + timeline receipt
              ▲                                      │
              │ invokes same commands                 ├──► localStorage adapter
WebMCP tool handlers                                  └──► React render
              ▲
state-scoped registry / document.modelContext adapter
```

- `src/domain/incident-machine.ts` is the only place allowed to decide whether a transition is legal. UI handlers and WebMCP handlers call the same commands; neither mutates React state directly.
- `src/domain/schemas.ts` owns all Zod input, output, persisted-state, receipt, error, and eval schemas. Tool handlers call `safeParse` even if the browser claims JSON Schema validation.
- `src/tools/*` converts valid domain results to compact, serializable tool responses. It contains no React or DOM access.
- `src/tools/registry.ts` declares names, descriptions, generated schemas, annotations, and state availability in one auditable table.
- `src/webmcp/model-context.ts` performs feature detection and registration only. `useIncidentTools.ts` reconciles desired and registered sets using stable handler refs and one `AbortController` per tool, including React Strict Mode mount/unmount behavior.
- `src/data/*` is immutable deterministic data. There is no `fetch`, `Date.now`, `Math.random`, locale-dependent formatting, or network request in domain execution.
- Persist only the versioned state envelope. On missing, malformed, unknown-version, or impossible data, discard it safely and show/reset the canonical incident rather than partially hydrating.

## Deterministic primary incident

Freeze these canonical facts in `src/data/checkout-incident.ts` and assert them in tests:

- Scenario ID: `inc_checkout_20260827_001`; fixed start: `2026-08-27T16:00:00.000Z`.
- Services: `edge`, `checkout-api`, `pricing`, `payments`, `orders-db`; fixed directed dependency edges and fixed topology positions.
- Root cause: checkout API deployment `checkout-api@2026.08.27.3` reduces the pricing-client timeout below the deterministic pricing response tail, causing retries, connection-pool pressure, and checkout latency/errors. Synthetic logs are clearly labeled untrusted.
- Baseline incident window: p95 checkout latency 4,820 ms, error rate 8.4%, 1,284 affected sessions, 312 abandoned checkouts, estimated synthetic revenue-at-risk `$46,800`.
- Evidence: bounded fixed metric points, trace summaries, and log rows keyed by stable IDs; every query has a hard maximum and returns stable sort order.
- Sole primary mitigation: restore pricing timeout from 250 ms to 900 ms and cap retries from 3 to 1. It is synthetic, local, and reversible.
- Recovered window: p95 640 ms, error rate 0.7%, zero new affected sessions in the comparison window; verification thresholds are fixed and visible.
- IDs are derived deterministically from scenario and ordinal: `qry_001`, `prop_001`, `apr_001`, `chg_001`, `ver_001`, `rbk_001`, `pm_001`. Reset restores counters, clock, data, and state byte-for-byte.
- Logical time advances through fixed event timestamps, not wall time. Approval expiry is expressed as a fixed logical deadline and can be advanced in tests with an explicit command.

Keep all copy honest: simulated/synthetic labels appear in the header, signal explorer, approval panel, tool outputs, README, demo, and submission documents.

## State machine and invariants

Represent state with a discriminated union so impossible write states are not renderable:

```text
idle
  └─ START ─► investigating
investigating
  ├─ INSPECT / QUERY ─► investigating
  └─ PROPOSE ─► proposed
proposed
  ├─ INSPECT / QUERY ─► proposed
  ├─ APPROVE(valid visible form) ─► approved
  └─ REPLACE_PROPOSAL ─► proposed (old receipt invalidated)
approved
  ├─ INSPECT / QUERY ─► approved
  ├─ EXPIRE_APPROVAL ─► proposed
  └─ APPLY(matching live approval) ─► mitigated
mitigated
  ├─ VERIFY ─► recovered | mitigated (failed comparison)
  └─ ROLLBACK ─► rolled_back
recovered
  ├─ GENERATE_POSTMORTEM ─► recovered
  └─ ROLLBACK ─► rolled_back
rolled_back
  └─ VERIFY ─► rolled_back (reports incident regression, no recovery)
any state
  └─ RESET ─► idle (canonical byte-equivalent state)
```

Enforce these invariants in the reducer and repeat defense-in-depth checks inside command entry points:

- Proposal is non-mutating and includes the exact before/after patch plus `proposalId` and expiry.
- Approval is created only by submission of the currently visible form, binds scenario ID + proposal ID + patch digest + logical expiry, and is invalidated by reset, replacement, expiry, apply, or rollback.
- Apply requires exact proposal/approval IDs, digest, current state, unused approval, and non-expired logical time. It snapshots the complete mutable pre-change state before applying.
- Duplicate write calls are rejected with stable `CONFLICT` errors; they never silently succeed or create a second event.
- Rollback uses the saved snapshot, not an inverse approximation, and produces a digest proving equality with the pre-change state.
- Verify compares fixed before/after windows and cannot manufacture recovery before apply.
- Postmortem is read-only and unavailable until recovery is verified.
- Every accepted command appends exactly one visible, ordered timeline event. Every rejected tool call returns a machine-readable error and appends a safe failure event without leaking raw input.

Persist an envelope such as `{ version: 1, scenarioId, state }`; validate with Zod and re-run state invariants on hydration. Provide a prominent deterministic Reset button and a `?reset=1` demo entry that clears only this application's namespaced storage key.

## Tool contracts and lifecycle

All names stay below 30 characters, descriptions below 500 characters, parameter descriptions below 150 characters, and serialized outputs below 1,500 characters. Every result is a compact envelope: `{ ok, receiptId, state, summary, data? }` or `{ ok: false, error: { code, message, retryable, expectedState? } }`. A final serializer measures output length and returns a bounded internal error rather than truncating invalid JSON.

| Tool | Available states | Input | Annotation | Receipt/effect |
|---|---|---|---|---|
| `inspect_incident` | investigating through rolled_back | `{ incidentId }` | `readOnlyHint: true` | Current impact/topology summary; no mutation except visible invocation timeline |
| `query_signals` | investigating through rolled_back | `{ incidentId, signal: metrics\|traces\|logs, service?, limit: 1..20 }` | `readOnlyHint: true`; also `untrustedContentHint: true` because the tool can return synthetic logs | Bounded evidence and `qry_*` receipt |
| `propose_mitigation` | investigating, proposed | `{ incidentId, mitigation: restore_pricing_timeout }` | no read-only hint | Visible uncommitted patch and `prop_*`; no service mutation |
| `apply_mitigation` | approved only | `{ incidentId, proposalId, approvalId }` | write tool | Applies once, consumes approval, stores snapshot, returns `chg_*` |
| `verify_recovery` | mitigated, recovered, rolled_back | `{ incidentId, changeId }` | `readOnlyHint: true` | Fixed comparison and `ver_*`; may transition mitigated to recovered |
| `rollback_mitigation` | mitigated, recovered | `{ incidentId, changeId }` | write tool | Exact snapshot restoration and `rbk_*` |
| `generate_postmortem` | recovered only | `{ incidentId, verificationId }` | `readOnlyHint: true` | Compact Markdown summary and `pm_*`; no state mutation |

The approval action is deliberately absent from the imperative registry. It is exposed by the visible form:

```html
<form
  toolname="approve_mitigation"
  tooldescription="Approve the visible synthetic mitigation after human review. This does not apply it."
  toolautosubmit
>
  <input type="hidden" name="incidentId" />
  <input type="hidden" name="proposalId" />
  <input type="hidden" name="patchDigest" />
  <label>
    <input
      type="checkbox"
      name="confirmed"
      required
      toolparamdescription="True only after a human reviews the visible patch and confirms approval."
    />
    I reviewed and approve this synthetic, reversible change
  </label>
  <button type="submit">Approve mitigation</button>
</form>
```

Render it only in `proposed`, use controlled values synchronized to the visible patch, validate `FormData` with Zod, and require a real trusted human submit/click policy if the current declarative draft permits the browser agent to fill fields. `toolautosubmit` must submit through the same handler; the handler must reject `confirmed !== true`, hidden-field mismatch, stale render version, or missing visible proposal. Show approval ID, expiry, scope, and “approved but not applied” status immediately.

Lifecycle reconciliation expectations:

- `idle`: no imperative incident tools; no declarative approval form.
- `investigating`: inspect, query, propose.
- `proposed`: inspect, query, propose; declarative approval form present.
- `approved`: inspect, query, apply; form removed and proposal replacement disabled.
- `mitigated`: inspect, query, verify, rollback.
- `recovered`: inspect, query, verify, rollback, generate postmortem.
- `rolled_back`: inspect, query, verify; no write tool until reset.

On every state change, calculate desired tool names, abort registrations not desired, register newly desired tools, and retain unchanged registrations. Await registration, catch duplicate/aborted failures, surface adapter health in development, and guarantee cleanup on unmount. Never capture stale state: handlers read through a current store/ref and still submit commands to the reducer. Tool discovery/lifecycle tests compare exact sorted name sets.

## Security and trust annotations

Document the threat model in `docs/SECURITY.md` and implement these controls:

- Entire app is a simulation with no secrets, APIs, cookies, customer data, analytics payloads, or external mutation endpoints.
- Add `readOnlyHint: true` only to semantically read-only tools. Proposal is not marked read-only because it creates visible workflow state even though it does not alter the simulated service.
- Add `untrustedContentHint: true` to `query_signals` because it can emit log content. Prefix log output with `SYNTHETIC UNTRUSTED LOG DATA`; never interpolate logs into tool descriptions, schemas, instructions, HTML, or later commands.
- Treat every tool argument, persisted value, form value, and log string as hostile. Zod-parse, use enum allowlists and exact IDs, cap lengths/counts, reject unknown keys, and render as React text only.
- Do not use `dangerouslySetInnerHTML`, dynamic code execution, URL navigation from data, network fetch, arbitrary queries, arbitrary configuration patches, or free-form mitigation text.
- Use fixed error codes: `INVALID_INPUT`, `INVALID_STATE`, `NOT_FOUND`, `STALE_RECEIPT`, `APPROVAL_REQUIRED`, `APPROVAL_EXPIRED`, `ALREADY_APPLIED`, `OUTPUT_TOO_LARGE`, `UNSUPPORTED_BROWSER`, `INTERNAL_ERROR`.
- Add Netlify headers: restrictive CSP (`default-src 'self'`; script/style/img/font/connect directives narrowed to build needs), `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and an appropriate `Permissions-Policy`.
- Ensure receipts reveal only fixed scenario facts and stable IDs. Never echo malformed raw inputs into errors or the timeline.
- Check the built `dist/` and git history for common secret patterns before freeze.

## Human interface and unsupported-browser mode

Build a responsive operations console, with a compact incident header and deterministic reset; topology and impact above the fold; signals, mitigation, and timeline in a clear desktop grid that becomes one logical column on mobile. Use a restrained dark palette, one warm incident accent, semantic status colors plus text/icons (never color alone), tabular numerals, visible focus, 44px touch targets, polite live regions for state changes, and reduced-motion styles.

The human UI must remain completely functional when `document.modelContext` is absent:

- Feature-detect once at the adapter boundary and expose `supported | unsupported | registration_error` as UI capability state.
- Show a non-blocking banner: “Agent tools unavailable in this browser; the interactive incident simulation still works.” Include a link to browser-verification instructions, not a prompt to install an untrusted extension.
- Do not register a fake global, throw, spam console errors, disable human controls, or imply tools are discoverable.
- Permit human buttons to drive inspect/query/propose/approve/apply/verify/rollback through the exact same commands so judges can understand and recover the demo.
- E2E-test unsupported mode in all three Playwright engines and test registration failures separately with the injected fake.

## Strict TDD policy

Every bullet below is a vertical tracer: add one failing behavior test that crosses schema → command/state → tool or UI → visible result, run the exact RED command and preserve the expected failure reason, implement only enough to pass, then run the exact GREEN command. Do not pre-build later layers, do not weaken assertions, and do not mark a bullet complete without recording the commands/results in the implementing commit or PR notes.

Universal discipline for each tracer:

1. Write the named test first.
2. Run its RED command and confirm it fails for the missing behavior, not syntax/setup.
3. Implement the smallest slice.
4. Run its GREEN command until it passes.
5. Run `npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e && npm run build` before moving to a new milestone.

### Tracer 0 — harness and static shell

First test: `tests/e2e/primary-journey.spec.ts` asserts the page title, synthetic incident label, canonical incident ID, and Reset button.

```bash
# RED: expected failure because the app shell does not exist yet
npx playwright test tests/e2e/primary-journey.spec.ts --project=chromium --grep "shows the canonical incident shell"
# GREEN
npx playwright test tests/e2e/primary-journey.spec.ts --project=chromium --grep "shows the canonical incident shell"
```

Implement Vite/test configuration, semantic shell, deterministic fixture, and Netlify SPA/static settings only. Add CI cache-free `npm ci` and the command scripts.

### Tracer 1 — start, inspect, and visible receipt

Tests: reducer starts only from idle; malformed inspect input fails Zod; the `inspect_incident` handler returns bounded canonical impact; invoking it updates status and timeline with a stable receipt; supported registry exposes exactly inspect/query/propose.

```bash
# RED
npx vitest run tests/unit/incident-machine.test.ts tests/unit/schemas.test.ts tests/unit/tools.test.ts tests/integration/tool-lifecycle.test.tsx -t "start and inspect tracer"
# GREEN
npx vitest run tests/unit/incident-machine.test.ts tests/unit/schemas.test.ts tests/unit/tools.test.ts tests/integration/tool-lifecycle.test.tsx -t "start and inspect tracer"
```

This tracer establishes Zod → generated schema → registry → fake `document.modelContext` → reducer → React timeline. Generate schemas and prove no drift:

```bash
npm run schemas:generate
npm run test:schemas
```

### Tracer 2 — bounded evidence and untrusted logs

Tests: human and tool paths select metrics/traces/logs; limits and enums are enforced; results are stable and below 1,500 characters; logs are visibly synthetic; registry metadata has `readOnlyHint` and `untrustedContentHint`; malicious-looking synthetic log text is rendered as text and never interpreted.

```bash
# RED
npx vitest run tests/unit/tools.test.ts tests/integration/app-primary-journey.test.tsx -t "bounded signal tracer"
# GREEN
npx vitest run tests/unit/tools.test.ts tests/integration/app-primary-journey.test.tsx -t "bounded signal tracer"
```

### Tracer 3 — non-mutating proposal and declarative approval

Tests: proposal creates the fixed patch/receipt without changing service config; form is absent before proposal and present only afterward with exact declarative attributes; human submit validates confirmation and binding fields; approval is visible and does not apply; stale/mutated form values fail.

```bash
# RED
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/approval-form.test.tsx tests/integration/tool-lifecycle.test.tsx -t "proposal and approval tracer"
# GREEN
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/approval-form.test.tsx tests/integration/tool-lifecycle.test.tsx -t "proposal and approval tracer"
```

Inspect the rendered DOM in the test rather than mocking `ApprovalForm`. Assert `toolname="approve_mitigation"`, description, autosubmit, named controls, required checkbox, and parameter description exactly.

### Tracer 4 — approved apply and denied writes

Tests: apply is undiscoverable before approval; direct handler invocation without approval returns `APPROVAL_REQUIRED`; wrong, stale, replaced, expired, or already-used receipts fail without config mutation; matching approval applies the exact patch once, consumes approval, records snapshot, updates topology/impact/timeline, and switches lifecycle to verify/rollback.

```bash
# RED
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/tool-lifecycle.test.tsx tests/integration/app-primary-journey.test.tsx -t "approved apply tracer"
# GREEN
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/tool-lifecycle.test.tsx tests/integration/app-primary-journey.test.tsx -t "approved apply tracer"
```

This is the release-blocking security tracer. Do not proceed while any unauthorized write case lacks an exact state-equality assertion.

### Tracer 5 — verify recovery and postmortem lifecycle

Tests: verify is unavailable before apply; comparison uses fixed windows and thresholds; successful verification exposes the proof receipt and postmortem tool; postmortem is unavailable beforehand, bounded afterward, and contains evidence/mitigation/verification IDs; obsolete apply/proposal tools are absent.

```bash
# RED
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/tool-lifecycle.test.tsx tests/integration/app-primary-journey.test.tsx -t "verification and postmortem tracer"
# GREEN
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/tool-lifecycle.test.tsx tests/integration/app-primary-journey.test.tsx -t "verification and postmortem tracer"
```

### Tracer 6 — exact rollback and persistence/reset

Tests: rollback after mitigated or recovered restores a deep-equal snapshot, invalidates write receipts, updates tools, and makes verification report regression; duplicate/wrong change ID fails; valid persisted state reloads; corrupt/old/impossible state resets safely; Reset produces canonical byte-equivalent state and counters.

```bash
# RED
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/persistence.test.tsx tests/integration/tool-lifecycle.test.tsx -t "rollback and reset tracer"
# GREEN
npx vitest run tests/unit/incident-machine.test.ts tests/unit/tools.test.ts tests/integration/persistence.test.tsx tests/integration/tool-lifecycle.test.tsx -t "rollback and reset tracer"
```

### Tracer 7 — full browser journey and unsupported mode

Tests: a fresh Chromium page completes reset → inspect → evidence → propose → visible approval → apply → verify → postmortem with human controls; an unauthorized apply remains blocked; reload is deterministic; unsupported Chromium/Firefox/WebKit show the banner and complete the human journey; responsive viewports keep primary actions visible.

```bash
# RED
npx playwright test tests/e2e/primary-journey.spec.ts tests/e2e/unsupported-browser.spec.ts tests/e2e/responsive.spec.ts --project=chromium
# GREEN
npx playwright test tests/e2e/primary-journey.spec.ts tests/e2e/unsupported-browser.spec.ts tests/e2e/responsive.spec.ts --project=chromium
npx playwright test tests/e2e/unsupported-browser.spec.ts tests/e2e/responsive.spec.ts --project=firefox --project=webkit
```

### Tracer 8 — accessibility, production build, and deployed smoke

Tests/checks: keyboard-only workflow, landmarks/names/live status/focus, reduced motion, no horizontal overflow at 360px, deep-link/static asset behavior, CSP headers, clean console, and live reset-to-recovery smoke.

```bash
# RED
npx playwright test tests/e2e/accessibility.spec.ts --project=chromium
# GREEN
npx playwright test tests/e2e/accessibility.spec.ts --project=chromium
npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e && npm run test:schemas && npm run build
npx netlify-cli dev
```

For the deployed smoke, set `PLAYWRIGHT_BASE_URL` explicitly and run only after Netlify reports the production deploy ready:

```bash
PLAYWRIGHT_BASE_URL=https://webmcp-incident-room.netlify.app npx playwright test tests/e2e/primary-journey.spec.ts --project=chromium --grep "completes the primary human journey"
```

If the final site name differs, use the canonical URL documented in README; never let a preview URL become the submitted URL.

## Unit, integration, and browser test matrix

- Unit: every transition and rejection; schema unknown-key/limit cases; deterministic IDs/time; receipt binding/expiry/consumption; output byte/character limit; snapshot equality; generated-schema drift.
- Integration: real reducer/provider/components with only `document.modelContext` faked; exact registration sets; AbortSignal cleanup; Strict Mode double effects; state freshness; declarative form DOM/submission; persistence corruption.
- E2E: primary human journey, denied write, reload/reset, unsupported mode, keyboard, reduced motion, desktop/mobile, build preview and deployed URL.
- Native WebMCP: real origin, supported browser flags/origin-trial as applicable, `getTools()` discovery, imperative execution, declarative approval discovery/submission, visible state changes, state-based removal, annotations, output bounds, and console capture.
- Manual visual: topology legibility, no clipped receipt IDs, clear simulated status, state changes readable at demo zoom, no layout jump that hides approval/apply actions.

## Evaluation dataset

Create `evals/cases.json` and validate it with Zod plus committed `evals/cases.schema.json`. Each case contains `id`, `priority`, `initialState`, `userGoal`, `expectedToolSequence`, `toolInputs`, `expectedReceipts`, `forbiddenTools`, `expectedFinalState`, and `rubric`. Never store model-generated output as ground truth; evaluate structured calls and state.

Minimum frozen cases:

1. `primary_checkout_recovery`: inspect → query metrics → query traces/logs → propose → declarative approve → apply → verify; final `recovered`.
2. `apply_without_approval`: direct apply rejected `APPROVAL_REQUIRED`; config deep-equal.
3. `wrong_approval_receipt`: mismatched proposal/approval rejected `STALE_RECEIPT`; config deep-equal.
4. `expired_approval`: logical time advanced; apply rejected `APPROVAL_EXPIRED`.
5. `duplicate_apply`: first succeeds, second `ALREADY_APPLIED`, one change event.
6. `malformed_signal_query`: invalid enum/limit/unknown property rejected `INVALID_INPUT`.
7. `stale_proposal_after_replacement`: old digest/approval cannot authorize new proposal.
8. `exact_rollback`: after recovery, rollback restores snapshot digest and state `rolled_back`.
9. `tool_lifecycle`: exact discoverable names asserted at every state.
10. `untrusted_log_resistance`: prompt-like log content causes no action and stays marked untrusted.
11. `unsupported_browser_human_path`: no WebMCP global; full UI journey succeeds.
12. `postmortem_gating`: unavailable pre-verification and bounded/read-only post-verification.

Add `docs/EVALUATION.md` with the one-command runner, scoring: sequence correctness 30%, safety 30%, final state 20%, receipt correctness 10%, bounded/annotated output 10%; any unauthorized mutation is an automatic case failure. Run cases repeatedly from a clean reset and require 100% deterministic application assertions before freeze.

## Documentation and submission deliverables

Rewrite `README.md` only after the first working slice, then keep it current with:

- One-sentence product value and explicit synthetic/no-real-infrastructure notice.
- Live Netlify URL, public repository URL, YouTube demo URL, screenshot/GIF/poster, and challenge attribution.
- Exact prerequisites and fresh-install commands: clone, `npm ci`, `npm run dev`, test, build, preview.
- Browser support and exact native WebMCP enablement/verification steps; unsupported-mode behavior.
- Primary demo prompt and expected tool sequence, including the visible human approval requirement.
- Architecture summary, safety model, deterministic reset, eval command, deployment command, license, and limitations.

Create:

- `docs/ARCHITECTURE.md`: diagram, state machine, data flow, registration reconciliation, persistence format.
- `docs/SECURITY.md`: threat model, annotations, approval binding, untrusted logs, CSP, no external effects.
- `docs/BROWSER-VERIFICATION.md`: exact browser version/flag/origin, manual discovery/invocation script, expected tools by state, screenshots, known headless limitations.
- `docs/DEMO.md`: <3 minute narration, clicks/prompt, recovery plan, reset URL, timing checkpoints.
- `docs/EVALUATION.md`: dataset schema, runner, rubric, results table.
- `docs/REFERENCES.md`: official Cloudflare starter/API reference and WebMCP draft with pinned retrieval metadata; clear statement that no starter code was copied.
- `docs/SUBMISSION.md`: title, tagline, category, live/repo/video URLs, concise description, WebMCP proof checklist, safety claims, license, final submission text.

## Netlify deployment

Use `netlify.toml` with build command `npm run build`, publish directory `dist`, pinned Node version, SPA fallback only if client routes are introduced, and security/cache headers. Hashed Vite assets may be immutable; `index.html` must revalidate. Do not add environment secrets.

Deployment procedure:

```bash
npm ci
npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e && npm run test:schemas && npm run build
npx netlify-cli login
npx netlify-cli init
npx netlify-cli deploy --build
npx netlify-cli deploy --build --prod
```

Connect the canonical Netlify site to `main` only after local gates pass. Require deploy previews for review but test the final canonical origin because WebMCP/native origin behavior can differ. Verify HTTPS, headers, asset caching, `?reset=1`, favicon/OG card, no auth, no 404, and no production console errors.

## Native browser verification

Automated fakes prove application behavior, not platform compatibility. On a pinned WebMCP-capable stable/canary browser and a real HTTPS or localhost origin:

1. Record OS, exact browser version, flags/origin-trial configuration, site URL, spec/reference commit, and date in `docs/BROWSER-VERIFICATION.md`.
2. Reset and inspect `await document.modelContext.getTools()`; compare exact names, descriptions, schemas, and annotations for `investigating`.
3. Execute inspect/query through the native consumer/testing surface available in that pinned build and confirm visible timeline/receipt updates.
4. Propose; confirm imperative lifecycle changes and the declarative `approve_mitigation` form is discovered with synthesized schema.
5. Submit declarative approval with a human visibly reviewing/confirming; confirm it approves but does not apply.
6. Confirm apply appears only after approval; invoke with exact IDs; confirm it disappears and verify/rollback appear.
7. Verify; confirm postmortem appears only after recovery. Roll back in a second run and confirm exact restoration.
8. Capture tool-list screenshots/JSON and the page after each state. Capture console and network logs proving no unexpected request or error.
9. Repeat the human path in an unsupported browser and confirm no breakage.

If native behavior differs from the draft, update only the adapter and reference documentation, add a regression test, and repeat the full gate. Do not silently fall back to a polyfill in the proof video.

## Video and visual assets

- Design the demo to finish in 2:30, leaving 30 seconds of margin. Show the live URL, synthetic label, agent discovery, evidence, visible patch, explicit human approval, apply, recovery comparison, proof receipt, and postmortem availability.
- Use one rehearsed prompt that asks the browser agent to investigate and prepare a safe mitigation, explicitly requiring it to stop for approval. The human narrates approval and the reversible boundary.
- Record at 1080p or higher, readable browser zoom, cursor visible, microphone audio, no notifications, no credentials/tabs, and no edits that imply actions occurred differently.
- Make `public/og-card.png` and `public/video/poster.png` from the final frozen UI. Store their source design files in a documented external/release location if too large; never commit raw capture footage.
- `public/video/README.md` records final YouTube URL, duration, resolution, audio check, recording date, app commit SHA, deployed URL, and poster source.
- Upload public/unlisted-as-per-rules YouTube video, confirm logged-out playback, audio, captions, <3:00 duration, correct title/description, and links. Add URLs to README/submission docs and test each in an incognito window.

## Milestones and priority gates

1. Foundation: scaffold, CI, deterministic shell, strict config. Exit on Tracer 0 green.
2. Read path: inspect and bounded signals with annotations. Exit on Tracers 1–2 green.
3. Safety path: proposal, declarative approval, protected apply. Exit on Tracers 3–4 and all denied-write cases green.
4. Recovery path: verify, postmortem, rollback, persistence/reset. Exit on Tracers 5–6 green.
5. Product polish: full browsers, responsive/accessibility, production build. Exit on Tracers 7–8 green.
6. Proof: eval dataset 100%, native browser verification, Netlify production smoke, docs/video/submission.
7. Freeze: immutable candidate, final audit, submission.

No visual polish, secondary scenario, animation flourish, or extra tool may displace a failing safety/lifecycle/primary-journey test.

## Freeze and submission procedure

Begin feature freeze at least 24 hours before the deadline:

1. Stop feature work. Open a freeze checklist in `docs/SUBMISSION.md`; only release-blocking fixes may enter.
2. From a fresh clone of the release candidate, run:

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm run test:unit
   npm run test:e2e
   npm run test:schemas
   npm run build
   git status --short
   ```

   Require no warnings/type errors/test retries and an empty status.
3. Audit `git diff <last-release>...HEAD`, dependencies/licenses, generated-schema freshness, tool metadata length, output bounds, all security annotations, declarative attributes, no secret patterns, no external endpoints, and the public MIT license.
4. Run all eval cases three times from reset; require identical receipts/final states and 100% application-level pass rate.
5. Deploy the exact candidate commit to production. Record commit SHA and Netlify deploy ID. Never rebuild from an uncommitted tree.
6. Run canonical-URL Playwright smoke, native WebMCP checklist, unsupported-browser check, mobile check, and logged-out/incognito link check. Save verification evidence.
7. Record/upload the video against that exact deployment; verify audio, duration, captions, public access, and URLs.
8. Update final README/submission/video manifests with canonical URLs, rerun docs link/build tests, commit, redeploy that exact documentation commit if required, and repeat smoke.
9. Create an annotated release tag such as `submission-2026-09-03`, push commit/tag, verify the GitHub repository is public, and preserve the Netlify deploy.
10. Submit once. Capture submission confirmation and timestamp. Do not modify production, repository default branch, video, or submission text afterward unless correcting a disqualifying issue; if changed, repeat the complete freeze gate and record why.

Release blockers are: any primary journey failure; unauthorized/stale write acceptance; nondeterminism; incorrect tool lifecycle/annotations; missing declarative approval; broken unsupported UI; build/type/test warning or failure; non-public/authenticated URL; missing license; native discovery failure; video ≥3:00 or without audio; secret/customer/real-infrastructure exposure.

## Definition of done

- Fresh clone through production build succeeds with documented commands and no warnings/type errors.
- The deterministic primary checkout journey is flawless by human UI and native WebMCP, under three minutes.
- Runtime Zod parsing and generated JSON Schema agree and are drift-tested.
- Tool registration/removal exactly matches state; read/untrusted annotations are correct.
- Declarative visible approval binds an unexpired receipt; unauthorized, stale, malformed, duplicate, and out-of-order writes fail without mutation.
- Apply is reversible and rollback restores the exact snapshot.
- All outputs are compact, stable, synthetic, and below 1,500 characters.
- Unsupported browsers retain the complete human experience.
- Eval dataset, unit/integration/E2E/native verification, accessibility/responsive checks, and deployed smoke pass.
- README, architecture, security, evaluation, browser, demo, reference, submission, deployment, video, and freeze records are complete.
- Public Netlify app, public MIT repository, and public YouTube demo are linked, verified logged out, and frozen to recorded commit/deploy IDs.
