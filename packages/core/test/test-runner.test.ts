import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { TestcaseValidationError, parseAndCompilePolicy, runPolicyTests } from '../src';

async function readFixture(fileName: string): Promise<string> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  return readFile(path, 'utf8');
}

describe('runPolicyTests', () => {
  it('evaluates testcase suite and returns pass/fail report', async () => {
    const policyYaml = await readFixture('policy.safe-code-agent.yaml');
    const policy = parseAndCompilePolicy(policyYaml, 'yaml');

    const suite = {
      schema_version: '1',
      tests: [
        {
          id: 'allow-read',
          event: {
            schema_version: '1',
            event_id: 'evt_1',
            run_id: 'run_1',
            stage: 'request',
            tool_name: 'fs.read',
            arguments: { path: '/repo/README.md' },
            timestamp: '2026-02-22T00:00:00Z',
          },
          expected: {
            status: 'allow',
            matched_rule_id: 'allow-read',
            severity: 'low',
          },
        },
        {
          id: 'failing-check',
          event: {
            schema_version: '1',
            event_id: 'evt_2',
            run_id: 'run_1',
            stage: 'request',
            tool_name: 'shell.exec',
            arguments: { command: 'ls -la' },
            timestamp: '2026-02-22T00:00:01Z',
          },
          expected: {
            status: 'deny',
          },
        },
      ],
    };

    const report = runPolicyTests(policy, suite);

    expect(report.total).toBe(2);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.results[0]?.passed).toBe(true);
    expect(report.results[1]?.passed).toBe(false);
    expect(report.results[1]?.assertionFailures.length).toBeGreaterThan(0);
  });

  it('throws TestcaseValidationError for schema-invalid testcase data', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'allow' },
    });

    const badSuite = {
      schema_version: '1',
      tests: [
        {
          id: 'bad-ts',
          event: {
            schema_version: '1',
            event_id: 'evt_bad',
            run_id: 'run_bad',
            stage: 'request',
            tool_name: 'fs.read',
            arguments: { path: '/tmp/a' },
            timestamp: 'not-a-timestamp',
          },
          expected: {
            status: 'allow',
          },
        },
      ],
    };

    expect(() => runPolicyTests(policy, badSuite)).toThrowError(TestcaseValidationError);
  });
});
