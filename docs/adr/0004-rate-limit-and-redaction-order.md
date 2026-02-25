# ADR 0004: Rate-Limit and Redaction Evaluation Order

Status: Accepted  
Date: 2026-02-24

## Context

Phase 4 introduces rate-limit overrides and output redaction. The engine must remain deterministic and explainable while handling both behaviors.

## Decision

Event evaluation order is:

1. Base rule decision (first-match-wins)
2. Rate-limit evaluation and optional action override
3. Output redaction (for `stage=output` events)
4. Status normalization (`allow_with_redaction`, `deny_rate_limited`)

Redaction is applied for output events even when final action is deny, so logged payloads remain safe.

## Consequences

- Rate-limit overrides are explicit and reason-coded.
- Redaction behavior is deterministic and independent of allow/deny outcome.
- Decision status reflects post-processing effects without losing base action semantics.
