# ADR 0006: CLI Interactive Mode and Pretty Rendering

Status: Accepted  
Date: 2026-02-24

## Context

Phase 6 introduces a production CLI command surface. To improve day-to-day ergonomics, we want an interactive mode and more intentional pretty output while preserving deterministic machine output.

## Decision

1. Keep `json` output canonical for automation and CI.
2. Add `interactive` mode for keyboard-guided command execution.
3. Add a lightweight terminal theme layer for status badges, severity cues, and clearer summaries in pretty mode.

## Consequences

- Script usage remains stable and parseable through `--format json`.
- Human operators get faster discoverability and lower command memorization burden.
- CLI rendering concerns stay isolated from core policy semantics.
