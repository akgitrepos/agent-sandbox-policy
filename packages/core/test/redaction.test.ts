import { describe, expect, it } from 'vitest';

import { applyRedactionRules, parseAndCompilePolicy } from '../src';

describe('redaction engine', () => {
  it('applies text regex redaction to output strings and records mutations', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'allow' },
      redaction: [
        {
          id: 'mask-api-key',
          match: { stage: 'output', tool: 'shell.exec' },
          apply: {
            mode: 'text_regex',
            patterns: [{ regex: '(?i)api_key\\s*=\\s*\\w+', replace: 'api_key=[REDACTED]' }],
          },
        },
      ],
    });

    const result = applyRedactionRules({
      output: {
        stdout: 'done\nAPI_KEY=abcd1234SECRETXYZ',
        stderr: '',
      },
      rules: policy.redaction,
      toolName: 'shell.exec',
    });

    expect(result.applied).toBe(true);
    expect(result.ruleIds).toEqual(['mask-api-key']);
    expect(result.mutations.length).toBe(1);
    expect((result.output as { stdout: string }).stdout).toContain('[REDACTED]');
  });

  it('applies json field mask by field name recursively', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'allow' },
      redaction: [
        {
          id: 'mask-token',
          match: { stage: 'output', tool_in: ['http.call'] },
          apply: {
            mode: 'json_field_mask',
            field_names: ['token', 'password'],
            replacement: '***',
          },
        },
      ],
    });

    const result = applyRedactionRules({
      output: {
        token: 'abc',
        nested: {
          password: 'top-secret',
        },
      },
      rules: policy.redaction,
      toolName: 'http.call',
    });

    const output = result.output as { token: string; nested: { password: string } };
    expect(result.applied).toBe(true);
    expect(output.token).toBe('***');
    expect(output.nested.password).toBe('***');
    expect(result.mutations.length).toBe(2);
  });

  it('returns no-op outcome when no redaction rule matches', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'allow' },
      redaction: [
        {
          id: 'output-only',
          match: { stage: 'output', tool: 'shell.exec' },
          apply: {
            mode: 'text_regex',
            patterns: [{ regex: 'secret', replace: '[REDACTED]' }],
          },
        },
      ],
    });

    const result = applyRedactionRules({
      output: { stdout: 'secret' },
      rules: policy.redaction,
      toolName: 'web.search',
    });

    expect(result.applied).toBe(false);
    expect(result.ruleIds).toEqual([]);
    expect(result.mutations).toEqual([]);
  });
});
