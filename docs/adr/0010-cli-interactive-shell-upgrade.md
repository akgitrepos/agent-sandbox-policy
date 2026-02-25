# ADR 0010: CLI Interactive Shell Upgrade

Status: Accepted  
Date: 2026-02-24

## Context

The initial interactive CLI was functional but too plain compared with modern coding-agent terminal UX expectations.

## Decision

1. Upgrade interactive flows to use `@clack/prompts` for:
   - guided command selection
   - structured prompt steps
   - spinner-based run feedback
2. Make interactive mode the default when running `asp` with no subcommand.
3. Keep explicit command mode unchanged for CI/script usage.
4. Update local import specifiers in CLI sources to `.js` to improve ESM runtime compatibility in emitted output.

## Consequences

- Interactive UX becomes significantly more polished and approachable.
- Command-mode contracts stay stable and machine-friendly.
- CLI runtime behavior in local development is best with Bun/TS execution until full package-runtime hardening is completed in Phase 8.
