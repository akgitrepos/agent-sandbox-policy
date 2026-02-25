import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';

import {
  EventValidationError,
  PolicyValidationError,
  createSchemaValidator,
} from '../src';

async function readJsonFixture(fileName: string): Promise<unknown> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as unknown;
}

async function readYamlFixture(fileName: string): Promise<unknown> {
  const path = new URL(`./fixtures/${fileName}`, import.meta.url);
  const raw = await readFile(path, 'utf8');
  return load(raw);
}

describe('SchemaValidator', () => {
  it('validates baseline fixtures against schema catalog', async () => {
    const validator = createSchemaValidator();

    const policy = await readYamlFixture('policy.safe-code-agent.yaml');
    const requestEvent = await readJsonFixture('event.rm-rf-request.json');
    const outputEvent = await readJsonFixture('event.shell-output-with-secret.json');
    const decision = await readJsonFixture('decision.deny-rm-rf.decision.json');
    const trace = await readJsonFixture('trace.code-agent-run.json');
    const testcase = await readJsonFixture('testcase.safe-code-agent.tests.json');

    expect(validator.validate('policy', policy).valid).toBe(true);
    expect(validator.validate('event', requestEvent).valid).toBe(true);
    expect(validator.validate('event', outputEvent).valid).toBe(true);
    expect(validator.validate('decision', decision).valid).toBe(true);
    expect(validator.validate('trace', trace).valid).toBe(true);
    expect(validator.validate('testcase', testcase).valid).toBe(true);
  });

  it('maps invalid policy and event to typed validation errors', () => {
    const validator = createSchemaValidator();

    expect(() => validator.assertPolicy({ defaults: { decision: 'allow' } })).toThrowError(
      PolicyValidationError
    );
    expect(() => validator.assertEvent({ stage: 'request' })).toThrowError(EventValidationError);
  });

  it('returns structured validation issues for invalid input', () => {
    const validator = createSchemaValidator();

    const result = validator.validate('event', {
      schema_version: '1',
      stage: 'request',
      tool_name: 'shell.exec',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]?.schema).toBe('event');
  });
});
