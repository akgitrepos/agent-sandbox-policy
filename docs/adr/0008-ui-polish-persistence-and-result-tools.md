# ADR 0008: UI Polish Persistence and Result Utilities

Status: Accepted  
Date: 2026-02-24

## Context

Policy Lab workflows involve iterative editing and repeated comparison of JSON outputs. Users need safeguards against accidental refresh data loss and faster ways to move outputs into external tooling.

## Decision

1. Persist editor drafts to localStorage for policy, event, trace, tests, and output-event inputs.
2. Add result-level copy/export actions for each workflow panel.
3. Keep persistence local-only and lightweight without introducing server state.

## Consequences

- User drafts survive page refreshes and rapid context switches.
- Debugging and sharing outputs becomes faster with one-click copy/export.
- UI remains stateless from backend perspective and easy to evolve.
