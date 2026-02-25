import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { ReplayError, parseAndCompilePolicy, replayTrace } from '../src';

async function readFixture(fileName: string): Promise<string> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  return readFile(path, 'utf8');
}

describe('replayTrace', () => {
  it('replays trace events deterministically and returns summary counts', async () => {
    const policyYaml = await readFixture('policy.safe-code-agent.yaml');
    const policy = parseAndCompilePolicy(policyYaml, 'yaml');

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

  it('throws ReplayError for invalid timestamp values', async () => {
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

    expect(() => replayTrace(policy, badTrace)).toThrowError(ReplayError);
  });
});
