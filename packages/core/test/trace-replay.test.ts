import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { TraceValidationError, parseAndCompilePolicy, replayTrace } from '../src';

async function readFixture(fileName: string): Promise<string> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  return readFile(path, 'utf8');
}

describe('replayTrace', () => {
  it('replays trace events deterministically and returns summary counts', async () => {
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
          id: 'web-budget',
          match: { stage: 'request', tool: 'web.search' },
          limit: { scope: 'per_run', requests: 1, per: '1m' },
          on_exceed: { decision: 'deny' },
        },
      ],
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

    const trace = {
      schema_version: '1',
      trace_id: 'trace_phase5',
      run_id: 'run_phase5',
      events: [
        {
          schema_version: '1',
          event_id: 'evt_1',
          run_id: 'run_phase5',
          stage: 'request',
          tool_name: 'web.search',
          arguments: { q: 'first' },
          timestamp: '2026-02-22T00:00:00Z',
        },
        {
          schema_version: '1',
          event_id: 'evt_2',
          run_id: 'run_phase5',
          stage: 'request',
          tool_name: 'web.search',
          arguments: { q: 'second' },
          timestamp: '2026-02-22T00:00:10Z',
        },
        {
          schema_version: '1',
          event_id: 'evt_3',
          run_id: 'run_phase5',
          stage: 'output',
          tool_name: 'shell.exec',
          output: { stdout: 'API_KEY=abcd1234SECRETXYZ' },
          timestamp: '2026-02-22T00:00:20Z',
        },
      ],
    };

    const replay = replayTrace(policy, trace);

    expect(replay.events.length).toBe(3);
    expect(replay.events[0]?.result.status).toBe('allow');
    expect(replay.events[1]?.result.status).toBe('deny_rate_limited');
    expect(replay.events[2]?.result.redaction.applied).toBe(true);

    expect(replay.summary.totalEvents).toBe(3);
    expect(replay.summary.allowCount).toBe(1);
    expect(replay.summary.denyRateLimitedCount).toBe(1);
  });

  it('throws TraceValidationError for schema-invalid trace data', async () => {
    const policyYaml = await readFixture('policy.safe-code-agent.yaml');
    const policy = parseAndCompilePolicy(policyYaml, 'yaml');

    const badTrace = {
      schema_version: '1',
      trace_id: 'trace_invalid_ts',
      run_id: 'run_invalid_ts',
      events: [
        {
          schema_version: '1',
          event_id: 'evt_bad_ts',
          run_id: 'run_invalid_ts',
          stage: 'request',
          tool_name: 'fs.read',
          arguments: { path: '/repo/README.md' },
          timestamp: 'not-a-date',
        },
      ],
    };

    expect(() => replayTrace(policy, badTrace)).toThrowError(TraceValidationError);
  });
});
