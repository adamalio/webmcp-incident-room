# WebMCP Incident Room

## Current implementation and start

The implemented slice supports incident start, inspection, synthetic signal queries, receipts and reset. The mitigation/recovery workflow remains a specification and is not implemented yet. The original challenge brief below is preserved as historical context.

Use **Node 22**, then `npm ci` and `npm run dev -- --host 127.0.0.1 --port 4173`. Open `http://127.0.0.1:4173`; no credentials or environment file are required.

See [Development, checks and implementation boundaries](docs/DEVELOPMENT.md) for the tested commands, source map and next acceptance criteria.

## Original challenge brief

Working title and public repository for an OpenAI WebMCP Challenge entry.

A human-first production incident simulator where a browser agent can inspect evidence, propose a safe mitigation, request human approval, execute a reversible change, and verify recovery inside the same live page.

> Status: active build for the August 25-September 3, 2026 WebMCP Challenge submission period.

## Principles

- WebMCP is the core interaction layer, not decoration.
- The human interface remains primary and shows every agent action.
- All data and infrastructure are synthetic.
- State-changing actions require explicit confirmation and support rollback.
- Every action produces a compact proof receipt.

Implementation and testing instructions will be added as the first working slice lands.

## License

MIT. See [LICENSE](LICENSE).
