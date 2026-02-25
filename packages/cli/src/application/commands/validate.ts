import { createSchemaValidator, parseAndCompilePolicy } from '@asp/core';

import { CliError } from '../cli-error';
import { EXIT_CODE } from '../exit-codes';

import type { CommandExecution } from '../../types';

export interface ValidateCommandInput {
  readonly policy?: unknown;
  readonly event?: unknown;
  readonly trace?: unknown;
  readonly tests?: unknown;
}

interface ValidationEntry {
  readonly target: 'policy' | 'event' | 'trace' | 'tests';
  readonly valid: boolean;
}

interface ValidateOutput {
  readonly command: 'validate';
  readonly ok: boolean;
  readonly validations: readonly ValidationEntry[];
}

export function runValidate(input: ValidateCommandInput): CommandExecution<ValidateOutput> {
  const hasAny = input.policy || input.event || input.trace || input.tests;
  if (!hasAny) {
    throw new CliError('Provide at least one of --policy, --event, --trace, or --tests.');
  }

  const validator = createSchemaValidator();
  const validations: ValidationEntry[] = [];

  if (input.policy) {
    parseAndCompilePolicy(input.policy as Record<string, unknown>);
    validations.push({ target: 'policy', valid: true });
  }

  if (input.event) {
    validator.assertEvent(input.event);
    validations.push({ target: 'event', valid: true });
  }

  if (input.trace) {
    validator.assertTrace(input.trace);
    validations.push({ target: 'trace', valid: true });
  }

  if (input.tests) {
    validator.assertTestcase(input.tests);
    validations.push({ target: 'tests', valid: true });
  }

  return {
    exitCode: EXIT_CODE.SUCCESS,
    output: {
      command: 'validate',
      ok: true,
      validations,
    },
  };
}
