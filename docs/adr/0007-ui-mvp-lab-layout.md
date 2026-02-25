# ADR 0007: UI MVP Lab Layout and Core-Driven Evaluation

Status: Accepted  
Date: 2026-02-24

## Context

Phase 7 requires a usable web surface for policy authoring, event simulation, trace replay, policy tests, and redaction preview. We need a structure that stays aligned with deterministic core semantics.

## Decision

1. Implement a single "Policy Lab" shell with four workflow tabs:
   - Playground
   - Trace Replay
   - Policy Tests
   - Redaction Preview
2. Keep policy editing persistent across tabs to reduce context switching.
3. Execute all policy behavior through `@asp/core` functions from the UI layer.
4. Maintain mobile-friendly responsive layout with desktop split-pane optimization.

## Consequences

- UI reflects one coherent workflow from authoring to verification.
- Core semantics remain single-source-of-truth.
- Future refactor to state stores/workers can happen without changing user-facing flow.
