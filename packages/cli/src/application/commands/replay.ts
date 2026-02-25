import { parseAndCompilePolicy, replayTrace } from '@asp/core';

import { EXIT_CODE } from '../exit-codes.js';

import type { CommandExecution } from '../../types.js';

export interface ReplayCommandInput {
  readonly policy: unknown;
  readonly trace: unknown;
}

interface ReplayOutput {
  readonly command: 'replay';
  readonly ok: boolean;
  readonly result: ReturnType<typeof replayTrace>;
}

export function runReplay(input: ReplayCommandInput): CommandExecution<ReplayOutput> {
  const policy = parseAndCompilePolicy(input.policy as Record<string, unknown>);
  const result = replayTrace(policy, input.trace);

  return {
    exitCode: EXIT_CODE.SUCCESS,
    output: {
      command: 'replay',
      ok: true,
      result,
    },
  };
}
