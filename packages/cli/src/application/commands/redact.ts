import { parseAndCompilePolicy, evaluateEventResult } from '@asp/core';

import { CliError } from '../cli-error.js';
import { EXIT_CODE } from '../exit-codes.js';

import type { CommandExecution } from '../../types.js';

export interface RedactCommandInput {
  readonly policy: unknown;
  readonly event: unknown;
}

interface RedactOutput {
  readonly command: 'redact';
  readonly ok: boolean;
  readonly redaction: ReturnType<typeof evaluateEventResult>['redaction'];
  readonly redactedOutput?: unknown;
}

export function runRedact(input: RedactCommandInput): CommandExecution<RedactOutput> {
  const policy = parseAndCompilePolicy(input.policy as Record<string, unknown>);
  const result = evaluateEventResult(policy, input.event);

  if (!('stage' in (input.event as object)) || (input.event as { stage?: string }).stage !== 'output') {
    throw new CliError('Redaction preview requires an output-stage event.');
  }

  return {
    exitCode: EXIT_CODE.SUCCESS,
    output: {
      command: 'redact',
      ok: true,
      redaction: result.redaction,
      redactedOutput: result.redactedOutput,
    },
  };
}
