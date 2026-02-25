import { parseAndCompilePolicy, runPolicyTests } from '@asp/core';

import { EXIT_CODE } from '../exit-codes.js';

import type { CommandExecution } from '../../types.js';

export interface TestCommandInput {
  readonly policy: unknown;
  readonly tests: unknown;
}

interface TestOutput {
  readonly command: 'test';
  readonly ok: boolean;
  readonly report: ReturnType<typeof runPolicyTests>;
}

export function runTest(input: TestCommandInput): CommandExecution<TestOutput> {
  const policy = parseAndCompilePolicy(input.policy as Record<string, unknown>);
  const report = runPolicyTests(policy, input.tests);

  return {
    exitCode: report.failed > 0 ? EXIT_CODE.TESTS_FAILED : EXIT_CODE.SUCCESS,
    output: {
      command: 'test',
      ok: report.failed === 0,
      report,
    },
  };
}
