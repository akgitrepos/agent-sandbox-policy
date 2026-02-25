# ADR 0003: Evaluator First-Match-Wins Semantics

Status: Accepted  
Date: 2026-02-24

## Context

ASP requires deterministic policy decisioning with clear explainability for rule evaluation order.

## Decision

The evaluator uses ordered first-match-wins semantics:

1. Consider only `enabled=true` rules
2. Evaluate rules in defined order
3. Stop at first rule match
4. Use `defaults.decision` when no match exists

Explain metadata includes:
- evaluation mode
- checked rule count
- matched rule order (when matched)

## Consequences

- Decisions are deterministic and easy to audit.
- Rule ordering becomes a visible policy authoring contract.
- Advanced strategies (priority, deny-overrides) remain post-MVP extensions.
