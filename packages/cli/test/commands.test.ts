import { describe, expect, it } from 'vitest';

import { runEval } from '../src/application/commands/eval';
import { runRedact } from '../src/application/commands/redact';
import { runReplay } from '../src/application/commands/replay';
import { runTest } from '../src/application/commands/test';
import { runValidate } from '../src/application/commands/validate';

function createPolicy() {
  return {
    version: 1,
    evaluation: { mode: 'first_match_wins' },
    defaults: { decision: 'deny', explain: true },
    rules: [
      {
        id: 'allow-read',
        match: { stage: 'request', tool: 'fs.read' },
        action: { decision: 'allow' },
      },
      {
        id: 'approval-shell',
        match: { stage: 'request', tool: 'shell.exec' },
        action: { decision: 'require_approval', approval: { approver_type: 'human' } },
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
  } as const;
}

describe('cli command application layer', () => {
  it('validates policy and event payloads', () => {
    const result = runValidate({
      policy: createPolicy(),
      event: {
        schema_version: '1',
        event_id: 'evt_1',
        run_id: 'run_1',
        stage: 'request',
        tool_name: 'fs.read',
        arguments: { path: '/repo/README.md' },
        timestamp: '2026-02-22T00:00:00Z',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.output.ok).toBe(true);
  });

  it('evaluates event and returns expected decision status', () => {
    const result = runEval({
      policy: createPolicy(),
      event: {
        schema_version: '1',
        event_id: 'evt_2',
        run_id: 'run_1',
        stage: 'request',
        tool_name: 'shell.exec',
        arguments: { command: 'ls -la' },
        timestamp: '2026-02-22T00:00:05Z',
      },
    });

    expect(result.output.result.status).toBe('require_approval');
    expect(result.output.result.decision.matchedRuleId).toBe('approval-shell');
  });

  it('replays trace and aggregates status summary', () => {
    const replay = runReplay({
      policy: createPolicy(),
      trace: {
        schema_version: '1',
        trace_id: 'trace_1',
        run_id: 'run_1',
        events: [
          {
            schema_version: '1',
            event_id: 'evt_1',
            run_id: 'run_1',
            stage: 'request',
            tool_name: 'web.search',
            arguments: { q: 'first' },
            timestamp: '2026-02-22T00:00:00Z',
          },
          {
            schema_version: '1',
            event_id: 'evt_2',
            run_id: 'run_1',
            stage: 'request',
            tool_name: 'web.search',
            arguments: { q: 'second' },
            timestamp: '2026-02-22T00:00:10Z',
          },
        ],
      },
    });

    expect(replay.output.result.summary.totalEvents).toBe(2);
    expect(replay.output.result.summary.denyRateLimitedCount).toBe(1);
  });

  it('maps test failures to exit code 1', () => {
    const report = runTest({
      policy: createPolicy(),
      tests: {
        schema_version: '1',
        tests: [
          {
            id: 'must-fail',
            event: {
              schema_version: '1',
              event_id: 'evt_1',
              run_id: 'run_1',
              stage: 'request',
              tool_name: 'fs.read',
              arguments: { path: '/repo/README.md' },
              timestamp: '2026-02-22T00:00:00Z',
            },
            expected: { status: 'deny' },
          },
        ],
      },
    });

    expect(report.exitCode).toBe(1);
    expect(report.output.ok).toBe(false);
  });

  it('returns redaction preview for output event', () => {
    const redaction = runRedact({
      policy: createPolicy(),
      event: {
        schema_version: '1',
        event_id: 'evt_out',
        run_id: 'run_1',
        stage: 'output',
        tool_name: 'shell.exec',
        output: { stdout: 'API_KEY=abcd1234' },
        timestamp: '2026-02-22T00:00:20Z',
      },
    });

    expect(redaction.exitCode).toBe(0);
    expect(redaction.output.redaction.applied).toBe(true);
    expect((redaction.output.redactedOutput as { stdout: string }).stdout).toContain('[REDACTED]');
  });
});
