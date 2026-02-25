# ADR 0005: CLI UX Direction and Stack Governance

Status: Accepted  
Date: 2026-02-24

## Context

ASP requires a high-quality CLI experience that is both CI-safe and pleasant for day-to-day interactive use. We want modern coding-agent ergonomics without coupling CLI rendering details to core policy semantics.

## Decision

1. Keep `@asp/core` as the only source of policy behavior.
2. Implement CLI as an adapter with layered responsibilities:
   - command routing
   - workflow orchestration
   - output presentation (`json` and `pretty`)
   - IO/process concerns
3. Treat interactive UX stack choice as replaceable infrastructure.
4. Require documentation updates (spec + plan + ADR) for major CLI UX/tooling changes.

## Consequences

- We can iterate on terminal UX aggressively without destabilizing core decision semantics.
- Machine output contracts stay stable while interactive UX evolves.
- Architectural intent remains explicit for contributors and future maintainers.
