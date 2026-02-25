import { evaluateEventResult, parseAndCompilePolicy } from '@asp/core';

import { EXIT_CODE } from '../exit-codes';

import type { CommandExecution } from '../../types';

export interface EvalCommandInput {
  readonly policy: unknown;
  readonly event: unknown;
}

interface EvalOutput {
  readonly command: 'eval';
  readonly ok: boolean;
  readonly result: ReturnType<typeof evaluateEventResult>;
}

export function runEval(input: EvalCommandInput): CommandExecution<EvalOutput> {
  const policy = parseAndCompilePolicy(input.policy as Record<string, unknown>);
  const result = evaluateEventResult(policy, input.event);

  return {
    exitCode: EXIT_CODE.SUCCESS,
    output: {
      command: 'eval',
      ok: true,
      result,
    },
  };
}
