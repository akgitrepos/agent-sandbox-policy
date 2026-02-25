#!/usr/bin/env node

import { Command } from 'commander';

import { runEval } from './application/commands/eval';
import { runRedact } from './application/commands/redact';
import { runReplay } from './application/commands/replay';
import { runTest } from './application/commands/test';
import { runValidate } from './application/commands/validate';
import { commandFailureOutput } from './application/run-command';
import { readStructuredFile } from './io/read-structured-file';
import { writeError } from './presenters/write-error';
import { writeOutput } from './presenters/write-output';
import type { OutputFormat } from './types';

interface CommonOptions {
  format: OutputFormat;
}

function parseOutputFormat(value: string): OutputFormat {
  if (value === 'json' || value === 'pretty') {
    return value;
  }

  throw new Error(`Invalid format '${value}'. Use 'json' or 'pretty'.`);
}

function addFormatOption(command: Command): Command {
  return command.option('--format <format>', 'output format: pretty|json', parseOutputFormat, 'pretty');
}

async function emit(
  commandName: 'validate' | 'eval' | 'replay' | 'test' | 'redact',
  format: OutputFormat,
  producer: () => Promise<{ exitCode: number; output: unknown }>
): Promise<void> {
  try {
    const result = await producer();
    writeOutput(result.output, format);
    process.exitCode = result.exitCode;
  } catch (error: unknown) {
    writeError(error);
    const failure = commandFailureOutput(commandName, error);
    if (format === 'json') {
      writeOutput(failure.output, 'json');
    }
    process.exitCode = failure.exitCode;
  }
}

const program = new Command();

program
  .name('asp')
  .description('Agent Sandbox Policy CLI')
  .version('0.1.1-draft');

addFormatOption(
  program
    .command('validate')
    .description('Validate policy/event/trace/testcase inputs')
    .option('--policy <path>', 'path to policy YAML/JSON')
    .option('--event <path>', 'path to event JSON')
    .option('--trace <path>', 'path to trace JSON')
    .option('--tests <path>', 'path to testcase JSON')
    .action(async (options: CommonOptions & { policy?: string; event?: string; trace?: string; tests?: string }) => {
      await emit('validate', options.format, async () =>
        runValidate({
          policy: options.policy ? await readStructuredFile(options.policy) : undefined,
          event: options.event ? await readStructuredFile(options.event) : undefined,
          trace: options.trace ? await readStructuredFile(options.trace) : undefined,
          tests: options.tests ? await readStructuredFile(options.tests) : undefined,
        })
      );
    })
);

addFormatOption(
  program
    .command('eval')
    .description('Evaluate one event against a policy')
    .requiredOption('--policy <path>', 'path to policy YAML/JSON')
    .requiredOption('--event <path>', 'path to event JSON')
    .action(async (options: CommonOptions & { policy: string; event: string }) => {
      await emit('eval', options.format, async () =>
        runEval({
          policy: await readStructuredFile(options.policy),
          event: await readStructuredFile(options.event),
        })
      );
    })
);

addFormatOption(
  program
    .command('replay')
    .description('Replay a trace against a policy')
    .requiredOption('--policy <path>', 'path to policy YAML/JSON')
    .requiredOption('--trace <path>', 'path to trace JSON')
    .action(async (options: CommonOptions & { policy: string; trace: string }) => {
      await emit('replay', options.format, async () =>
        runReplay({
          policy: await readStructuredFile(options.policy),
          trace: await readStructuredFile(options.trace),
        })
      );
    })
);

addFormatOption(
  program
    .command('test')
    .description('Run policy test suite')
    .requiredOption('--policy <path>', 'path to policy YAML/JSON')
    .requiredOption('--tests <path>', 'path to testcase JSON')
    .action(async (options: CommonOptions & { policy: string; tests: string }) => {
      await emit('test', options.format, async () =>
        runTest({
          policy: await readStructuredFile(options.policy),
          tests: await readStructuredFile(options.tests),
        })
      );
    })
);

addFormatOption(
  program
    .command('redact')
    .description('Preview redaction for an output event')
    .requiredOption('--policy <path>', 'path to policy YAML/JSON')
    .requiredOption('--event <path>', 'path to output event JSON')
    .action(async (options: CommonOptions & { policy: string; event: string }) => {
      await emit('redact', options.format, async () =>
        runRedact({
          policy: await readStructuredFile(options.policy),
          event: await readStructuredFile(options.event),
        })
      );
    })
);

await program.parseAsync(process.argv);
