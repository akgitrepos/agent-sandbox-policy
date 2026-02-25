# ADR 0011: Phase 8 Hardening and OSS Maturity Baseline

Status: Accepted  
Date: 2026-02-24

## Context

ASP reached feature-complete MVP behavior across core, CLI, and UI. Before broader OSS adoption, we need stronger reliability, compatibility, and contributor workflows.

## Decision

1. Add release-readiness automation and checklists.
2. Add CI workflow that enforces lint/typecheck/test/build and runtime compatibility checks.
3. Introduce compatibility scripts for Node and Bun execution paths.
4. Standardize package builds with tsup for cleaner distributable outputs.
5. Add contributor guidance and profiling entrypoint.

## Consequences

- Better confidence for external contributors and users.
- Faster regression detection through CI and compatibility checks.
- Cleaner package artifacts and improved runtime consistency.
