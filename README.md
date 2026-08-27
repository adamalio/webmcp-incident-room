# WebMCP Incident Room

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
