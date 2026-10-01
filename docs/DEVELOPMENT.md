# Development and current implementation

## Reproducible start

Use Node 22 (the supported range is `>=22 <23`) and the committed npm lockfile.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173`. No environment file, credentials, cloud account or production infrastructure is required. A regular browser can use the human interface; a browser with native `document.modelContext` can also discover the supported WebMCP tools. Unsupported browsers do not receive a fake production WebMCP API.

## Implemented behavior versus specification

The checked-in slice starts a deterministic checkout incident, inspects impact, queries bounded synthetic signals and shows evidence receipts and a timeline. Reset returns it to its initial state. The current domain state machine has `idle` and `investigating` phases.

Mitigation proposal, approval, applying changes, recovery verification, rollback and postmortem are requirements in [SPEC.md](SPEC.md), not completed features of this slice. The proposal handler currently returns `INVALID_STATE`. Preserve this distinction in demos and release claims; existing integration tests focus on the implemented inspection/query journey.

All scenario data is synthetic. The app does not manage real services, store real incident logs or invoke cloud-provider APIs.

## Verification

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:schemas
npm run build
npx playwright install chromium
npm run test:e2e
```

For a Linux CI runner use `npx playwright install --with-deps chromium`. Browser tests start an isolated local dev server on port 4173. The schema check regenerates schema files and compares their previous content; it fails on drift after writing the new files. Review the resulting diff before committing. Use `npm run schemas:generate` for an intentional regeneration when the source contract changes.

The [CI workflow](../.github/workflows/ci.yml) runs these checks on pull requests. Successful checks prove the implemented contracts, not the unfinished mitigation workflow or a live WebMCP-capable browser deployment.

## Source map

| Path          | Responsibility                                    |
| ------------- | ------------------------------------------------- |
| `src/app/`    | Human interface and state wiring                  |
| `src/domain/` | Incident state machine and schemas                |
| `src/data/`   | Deterministic scenario fixtures                   |
| `src/tools/`  | Tool contracts and supported handlers             |
| `src/webmcp/` | Native capability detection and tool registration |
| `tests/`      | Unit, integration and browser evidence            |

The challenge dates in the original brief are historical. The next product milestone is a tested reversible mitigation journey with matching visible approval, stale-receipt rejection and exact rollback before describing the full specification as shipped.
