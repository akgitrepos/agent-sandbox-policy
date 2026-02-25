import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { evaluateEventResult, InMemoryRateLimitStore, parseAndCompilePolicy } from '../src';
import { FixedClock } from '../src/utils';

async function readFixture(fileName: string): Promise<string> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  return readFile(path, 'utf8');
}

describe('evaluateEventResult policy effects', () => {
  it('returns deny_rate_limited when rate limit exceeds and override denies', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'deny' },
      rules: [
        {
          id: 'allow-web-search',
          match: { stage: 'request', tool: 'web.search' },
          action: { decision: 'allow' },
        },
      ],
      rate_limits: [
        {
          id: 'web-search-budget',
          match: { stage: 'request', tool: 'web.search' },
          limit: { scope: 'per_run', requests: 1, per: '1m' },
          on_exceed: { decision: 'deny', message: 'web.search budget exceeded' },
        },
      ],
    });

    const store = new InMemoryRateLimitStore();
    const clock = new FixedClock(1_000);

    const event1 = {
      schema_version: '1',
      event_id: 'evt_web_1',
      run_id: 'run_phase4',
      stage: 'request',
      tool_name: 'web.search',
      arguments: { q: 'first' },
      timestamp: '2026-02-22T00:00:00Z',
    };

    const event2 = {
      ...event1,
      event_id: 'evt_web_2',
      arguments: { q: 'second' },
      timestamp: '2026-02-22T00:00:01Z',
    };

    const first = evaluateEventResult(policy, event1, { rateLimitStore: store, clock });
    const second = evaluateEventResult(policy, event2, { rateLimitStore: store, clock });

    expect(first.status).toBe('allow');
    expect(first.rateLimit.applied).toBe(true);
    expect(first.rateLimit.exceeded).toBe(false);

    expect(second.status).toBe('deny_rate_limited');
    expect(second.decision.action).toBe('deny');
    expect(second.rateLimit.exceeded).toBe(true);
    expect(second.decision.reasons.map((reason) => reason.code)).toContain('RATE_LIMIT_EXCEEDED');
  });

  it('returns allow_with_redaction when allow decision mutates output', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'allow' },
      redaction: [
        {
          id: 'mask-auth',
          match: { stage: 'output', tool: 'shell.exec' },
          apply: {
            mode: 'text_regex',
            patterns: [
              {
                regex: '(?i)(authorization:\\s*bearer\\s+)[A-Za-z0-9\\-\\._~\\+\\/=]+',
                replace: '$1[REDACTED]',
              },
            ],
          },
        },
      ],
    });

    const result = evaluateEventResult(policy, {
      schema_version: '1',
      event_id: 'evt_output_redact',
      run_id: 'run_redact',
      stage: 'output',
      tool_name: 'shell.exec',
      output: {
        stdout: 'Authorization: Bearer token123',
      },
      timestamp: '2026-02-22T00:00:20Z',
    });

    expect(result.decision.action).toBe('allow');
    expect(result.status).toBe('allow_with_redaction');
    expect(result.redaction.applied).toBe(true);
    expect(result.redactedOutput).toBeDefined();
    expect(result.decision.reasons.map((reason) => reason.code)).toContain('REDACTION_APPLIED');
  });

  it('still applies output redaction when base decision is deny', async () => {
    const policyYaml = await readFixture('policy.safe-code-agent.yaml');
    const policy = parseAndCompilePolicy(policyYaml, 'yaml');

    const result = evaluateEventResult(policy, {
      schema_version: '1',
      event_id: 'evt_output_deny',
      run_id: 'run_deny',
      stage: 'output',
      tool_name: 'shell.exec',
      output: {
        stdout: 'API_KEY=abcd1234SECRETXYZ',
      },
      timestamp: '2026-02-22T00:00:30Z',
    });

    expect(result.decision.action).toBe('deny');
    expect(result.status).toBe('deny');
    expect(result.redaction.applied).toBe(true);
    expect((result.redactedOutput as { stdout: string }).stdout).toContain('[REDACTED]');
  });
});
