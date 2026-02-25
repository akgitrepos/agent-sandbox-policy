import { describe, expect, it } from 'vitest';

import {
  InMemoryRateLimitStore,
  buildRateLimitKey,
  evaluateRateLimits,
  parseAndCompilePolicy,
  parseDurationToMs,
} from '../src';
import { FixedClock } from '../src/utils';

describe('ratelimit utilities', () => {
  it('parses duration strings deterministically', () => {
    expect(parseDurationToMs('10ms')).toBe(10);
    expect(parseDurationToMs('2s')).toBe(2000);
    expect(parseDurationToMs('3m')).toBe(180000);
    expect(parseDurationToMs('1h')).toBe(3600000);
    expect(parseDurationToMs('1d')).toBe(86400000);
  });

  it('builds stable rate limit keys per scope', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'deny' },
      rate_limits: [
        {
          id: 'per-run',
          match: { stage: 'request', tool: 'web.search' },
          limit: { scope: 'per_run', requests: 1, per: '1m' },
          on_exceed: { decision: 'deny' },
        },
      ],
    });

    const key = buildRateLimitKey(policy.rate_limits[0]!, {
      schema_version: '1',
      event_id: 'evt_1',
      run_id: 'run_abc',
      stage: 'request',
      tool_name: 'web.search',
      arguments: { q: 'test' },
      timestamp: '2026-02-22T00:00:00Z',
    });

    expect(key).toBe('ratelimit:per-run:run:run_abc');
  });

  it('overrides decision when matching rate limit exceeds threshold', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'allow' },
      rate_limits: [
        {
          id: 'web-budget',
          match: { stage: 'request', tool: 'web.search' },
          limit: { scope: 'per_run', requests: 1, per: '1m' },
          on_exceed: { decision: 'deny', message: 'budget exceeded' },
        },
      ],
    });
    const rule = policy.rate_limits[0]!;
    const store = new InMemoryRateLimitStore();
    const clock = new FixedClock(1000);

    const first = evaluateRateLimits(
      policy,
      {
        schema_version: '1',
        event_id: 'evt_1',
        run_id: 'run_1',
        stage: 'request',
        tool_name: 'web.search',
        arguments: { q: 'a' },
        timestamp: '2026-02-22T00:00:00Z',
      },
      store,
      clock
    );

    const second = evaluateRateLimits(
      policy,
      {
        schema_version: '1',
        event_id: 'evt_2',
        run_id: 'run_1',
        stage: 'request',
        tool_name: 'web.search',
        arguments: { q: 'b' },
        timestamp: '2026-02-22T00:00:01Z',
      },
      store,
      clock
    );

    expect(first.applied).toBe(true);
    expect(first.ruleId).toBe(rule.id);
    expect(first.exceeded).toBe(false);
    expect(second.exceeded).toBe(true);
    expect(second.overrideAction).toBe('deny');
    expect(second.message).toBe('budget exceeded');
  });
});
