import { AspError } from '@asp/core';

import { EXIT_CODE } from './exit-codes.js';

import type { CommandExecution } from '../types.js';

export async function runCommand<T extends { command: string; ok: boolean }>(
  action: () => Promise<CommandExecution<T>>
): Promise<CommandExecution<T>> {
  try {
    return await action();
  } catch (error: unknown) {
    if (error instanceof AspError) {
      throw error;
    }

    throw error;
  }
}

export function commandFailureOutput(command: string, error: unknown): CommandExecution<{ command: string; ok: false; error: string }> {
  const message = error instanceof Error ? error.message : String(error);

  return {
    exitCode: EXIT_CODE.FAILURE,
    output: {
      command,
      ok: false,
      error: message,
    },
  };
}
