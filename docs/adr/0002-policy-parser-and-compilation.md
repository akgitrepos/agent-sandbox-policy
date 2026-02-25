# ADR 0002: Policy Parser and Compilation Pipeline

Status: Accepted  
Date: 2026-02-24

## Context

ASP needs a deterministic policy loading path that supports YAML/JSON inputs, schema validation, normalization defaults, and compile-time checks such as regex validation.

## Decision

The parser pipeline is:
1. Parse text/object input (`json` or `yaml`)
2. Validate policy structure with schema validator
3. Normalize defaults (`defaults.explain`, `enabled` flags, empty arrays)
4. Compile matcher and redaction regex patterns
5. Return a canonical compiled policy model

Regex failures are treated as explicit `PolicyCompilationError` exceptions.

## Consequences

- Parser and compiler concerns remain isolated from evaluator logic.
- Policy loading fails early with typed errors.
- Future operator additions can be introduced in the compiler without changing parse/validation boundaries.
