# ADR 0001: Core Engine Principles

Status: Accepted  
Date: 2026-02-24

## Context

ASP requires deterministic policy evaluation and clear package boundaries to support reliability, replay, and future expansion.

## Decision

The project adopts these implementation principles:
- Deterministic evaluator behavior by default
- Pure core logic with side effects at CLI/UI boundaries
- Contract-first development with schema-backed IO
- First-match-wins rule semantics
- Additive extensibility over breaking rewrites

## Consequences

- Core modules will use explicit interfaces for stateful concerns (clock, stores)
- Public APIs stay minimal and stable
- New functionality must preserve explainability and deterministic outputs
