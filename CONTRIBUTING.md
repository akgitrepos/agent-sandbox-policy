# Contributing to ASP

Thanks for contributing to Agent Sandbox Policy (ASP).

## Development setup

1. Install dependencies

```bash
pnpm install
```

2. Run repository quality gates

```bash
pnpm check:all
```

## Common commands

- `pnpm lint` - lint all workspaces
- `pnpm typecheck` - typecheck all workspaces
- `pnpm test` - run all test suites
- `pnpm build` - build all packages
- `pnpm compat:node` - verify Node runtime compatibility
- `pnpm compat:bun` - verify Bun runtime compatibility

## Coding standards

- Keep `@asp/core` deterministic and side-effect-light.
- Do not duplicate policy logic in CLI or UI layers.
- Add tests with every behavior change.
- Keep commits logically scoped and descriptive.

## Pull request checklist

- [ ] Lint, typecheck, tests, and build pass locally
- [ ] Added/updated tests for behavior changes
- [ ] Added ADR for architecture-impacting decisions
- [ ] Updated spec/plan/docs when changing public behavior

## Reporting issues

When reporting bugs, include:
- policy input (or minimal excerpt)
- event/trace/test payloads
- expected vs actual result
- environment info (`node -v`, `pnpm -v`, `bun -v` if applicable)
