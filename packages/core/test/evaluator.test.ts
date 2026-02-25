import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';

import { evaluateEvent, parseAndCompilePolicy } from '../src';

async function readYamlFixture(fileName: string): Promise<string> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  return readFile(path, 'utf8');
}

async function readJsonFixture<T>(fileName: string): Promise<T> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as T;
}

describe('evaluateEvent', () => {
  it('applies first-match-wins semantics in rule order', async () => {
    const policyYaml = await readYamlFixture('policy.safe-code-agent.yaml');
    const policy = parseAndCompilePolicy(policyYaml, 'yaml');

    const allowReadEvent = {
      schema_version: '1',
      event_id: 'evt_allow_1',
      run_id: 'run_1',
      stage: 'request',
      tool_name: 'fs.read',
      arguments: { path: '/repo/README.md' },
      timestamp: '2026-02-22T00:00:00Z',
    };

    const decision = evaluateEvent(policy, allowReadEvent);

    expect(decision.action).toBe('allow');
    expect(decision.matchedRuleId).toBe('allow-read');
    expect(decision.explain.rulesChecked).toBe(1);
    expect(decision.explain.matchedRuleOrder).toBe(1);
  });

  it('matches regex_any rule and denies destructive shell command', async () => {
    const policyYaml = await readYamlFixture('policy.safe-code-agent.yaml');
    const policy = parseAndCompilePolicy(policyYaml, 'yaml');
    const event = await readJsonFixture<Record<string, unknown>>('event.rm-rf-request.json');

    const decision = evaluateEvent(policy, event);

    expect(decision.action).toBe('deny');
    expect(decision.matchedRuleId).toBe('deny-rm-rf');
    expect(decision.explain.rulesChecked).toBe(2);
    expect(decision.explain.matchedRuleOrder).toBe(2);
  });

  it('returns require_approval when generic shell rule is first match', async () => {
    const policyYaml = await readYamlFixture('policy.safe-code-agent.yaml');
    const policy = parseAndCompilePolicy(policyYaml, 'yaml');

    const shellEvent = {
      schema_version: '1',
      event_id: 'evt_shell_1',
      run_id: 'run_1',
      stage: 'request',
      tool_name: 'shell.exec',
      arguments: {
        command: 'ls -la',
      },
      timestamp: '2026-02-22T00:00:01Z',
    };

    const decision = evaluateEvent(policy, shellEvent);

    expect(decision.action).toBe('require_approval');
    expect(decision.matchedRuleId).toBe('require-approval-shell');
    expect(decision.reasons.map((reason) => reason.code)).toContain('APPROVAL_REQUIRED');
    expect(decision.explain.rulesChecked).toBe(3);
  });

  it('falls back to default decision when no enabled rule matches', async () => {
    const source = await readYamlFixture('policy.safe-code-agent.yaml');
    const parsed = load(source) as Record<string, unknown>;
    const policy = parseAndCompilePolicy({
      ...parsed,
      defaults: { decision: 'deny', explain: true },
      rules: [],
    });

    const event = {
      schema_version: '1',
      event_id: 'evt_unknown_tool',
      run_id: 'run_1',
      stage: 'request',
      tool_name: 'unknown.tool',
      arguments: {},
      timestamp: '2026-02-22T00:00:10Z',
    };

    const decision = evaluateEvent(policy, event);

    expect(decision.action).toBe('deny');
    expect(decision.matchedRuleId).toBeNull();
    expect(decision.reasons[0]?.code).toBe('DEFAULT_DECISION');
    expect(decision.explain.rulesChecked).toBe(0);
  });

  it('supports starts_with and contains operator constraints', () => {
    const policy = parseAndCompilePolicy({
      version: 1,
      evaluation: { mode: 'first_match_wins' },
      defaults: { decision: 'deny' },
      rules: [
        {
          id: 'starts-with-match',
          match: {
            stage: 'request',
            args: {
              command: {
                starts_with: 'git ',
                contains: 'status',
              },
            },
          },
          action: { decision: 'allow' },
        },
      ],
    });

    const decision = evaluateEvent(policy, {
      schema_version: '1',
      event_id: 'evt_ops_1',
      run_id: 'run_1',
      stage: 'request',
      tool_name: 'shell.exec',
      arguments: {
        command: 'git status -s',
      },
      timestamp: '2026-02-22T00:00:20Z',
    });

    expect(decision.action).toBe('allow');
    expect(decision.matchedRuleId).toBe('starts-with-match');
  });
});
