# Phase 8 Release Readiness Checklist

This checklist is used before tagging external preview/stable releases.

## Quality gates

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm compat:node`
- [ ] `pnpm compat:bun`

## Runtime reliability

- [ ] CLI command mode verified on fixture workflows
- [ ] CLI interactive mode verified manually
- [ ] UI policy lab runs through all workflow tabs
- [ ] Core replay and test-runner outputs match expected fixtures

## Packaging and versioning

- [ ] Package versions aligned
- [ ] Dist artifacts generated cleanly
- [ ] Export maps and type declarations verified

## Documentation and governance

- [ ] ADRs added for architecture-impacting changes
- [ ] `Specification.md` updated for behavior changes
- [ ] `IMPLEMENTATION_PLAN.md` updated for execution/architecture changes
- [ ] `CONTRIBUTING.md` reflects current commands and process

## Optional pre-release profiling

- [ ] `pnpm --filter @asp/core profile`
- [ ] Throughput/regression comparison captured
