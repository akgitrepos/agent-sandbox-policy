# ADR 0009: UI 7.2 UX Pass (Summary Chips, Sticky Actions, Accessibility)

Status: Accepted  
Date: 2026-02-24

## Context

The Policy Lab now supports all MVP workflows. To improve day-to-day operator ergonomics, we need faster visual interpretation of results and better usability on smaller screens.

## Decision

1. Add per-workflow summary chips (status and key counters) above editors.
2. Add sticky headers/action rows on mobile to reduce scroll friction.
3. Improve keyboard accessibility through focus-visible states and explicit aria labels.

## Consequences

- Faster at-a-glance understanding of decision outcomes.
- Better action discoverability during long-form editing on mobile.
- Improved keyboard and assistive technology support with low implementation complexity.
