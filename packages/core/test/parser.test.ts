import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  ParseError,
  PolicyCompilationError,
  PolicyValidationError,
  parseAndCompilePolicy,
  parsePolicy,
} from '../src';

async function readFixture(fileName: string): Promise<string> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  return readFile(path, 'utf8');
}

describe('policy parser and compiler', () => {
  it('parses yaml policy and applies normalization defaults', async () => {
    const yaml = await readFixture('policy.safe-code-agent.yaml');

    const compiled = parseAndCompilePolicy(yaml, 'yaml');

    expect(compiled.defaults.explain).toBe(true);
    expect(compiled.rules.length).toBeGreaterThan(0);
    expect(compiled.rules[0]?.enabled).toBe(true);
    expect(compiled.rules[0]?.order).toBe(1);
    expect(compiled.rate_limits[0]?.enabled).toBe(true);
    expect(compiled.redaction[0]?.enabled).toBe(true);
  });

  it('compiles regex operators and redaction regex patterns', () => {
    const policy = {
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'deny' },
      rules: [
        {
          id: 'regex-rule',
          match: {
            stage: 'request',
            args: {
              command: {
                regex: 'rm\\s+-rf',
                regex_any: ['mkfs', 'dd\\s+if='],
              },
            },
          },
          action: { decision: 'deny' },
        },
      ],
      redaction: [
        {
          id: 'redact-output',
          match: {
            stage: 'output',
            tool: 'shell.exec',
          },
          apply: {
            mode: 'text_regex',
            patterns: [{ regex: '(?i)api_key\\s*=\\s*\\w+', replace: 'api_key=[REDACTED]' }],
          },
        },
      ],
    } as const;

    const compiled = parseAndCompilePolicy(policy);
    const commandMatcher = compiled.rules[0]?.match.args?.command as
      | { regex?: RegExp; regex_any?: RegExp[] }
      | undefined;
    const redactionPattern =
      compiled.redaction[0]?.apply.mode === 'text_regex'
        ? compiled.redaction[0].apply.patterns[0]
        : undefined;

    expect(commandMatcher?.regex).toBeInstanceOf(RegExp);
    expect(commandMatcher?.regex_any?.[0]).toBeInstanceOf(RegExp);
    expect(redactionPattern?.regex).toBeInstanceOf(RegExp);
  });

  it('throws parse error on malformed yaml/json text', () => {
    expect(() => parsePolicy('{ invalid-json', 'json')).toThrowError(ParseError);
  });

  it('throws policy validation error for schema-invalid policy', () => {
    expect(() => parsePolicy({ defaults: { decision: 'deny' } })).toThrowError(PolicyValidationError);
  });

  it('throws policy compilation error for invalid regex', () => {
    const badRegexPolicy = {
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'deny' },
      rules: [
        {
          id: 'bad-rule',
          match: {
            stage: 'request',
            args: {
              command: { regex: '(' },
            },
          },
          action: { decision: 'deny' },
        },
      ],
    } as const;

    expect(() => parseAndCompilePolicy(badRegexPolicy)).toThrowError(PolicyCompilationError);
  });
});
