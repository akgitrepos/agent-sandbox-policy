#!/usr/bin/env node

import { Command } from 'commander';

import { runEval } from './application/commands/eval.js';
import { runRedact } from './application/commands/redact.js';
import { runReplay } from './application/commands/replay.js';
import { runTest } from './application/commands/test.js';
import { runValidate } from './application/commands/validate.js';
import { commandFailureOutput } from './application/run-command.js';
import {
  finishInteractiveSpinner,
  promptInteractiveSelection,
  promptPaths,
  startInteractiveSpinner,
  type InteractiveCommand,
} from './io/interactive-shell.js';
import { readStructuredFile } from './io/read-structured-file.js';
import { writeError } from './presenters/write-error.js';
import { writeOutput } from './presenters/write-output.js';
import { info, title } from './presenters/theme.js';
import type { OutputFormat } from './types.js';

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

async function runInteractiveMode(): Promise<void> {
  process.stdout.write(`${title('ASP Interactive Mode')}\n`);
  process.stdout.write(`${info('Tip')}: Use command mode for CI and scripting.\n`);

  let shouldContinue = true;

  while (shouldContinue) {
    const selection = await promptInteractiveSelection();
    if (selection.command === 'exit') {
      shouldContinue = false;
      continue;
    }

    const paths = await promptPaths(selection.command);
    await runInteractiveCommand(selection.command, selection.format, paths);
  }
}

async function runInteractiveCommand(
  command: Exclude<InteractiveCommand, 'exit'>,
  format: OutputFormat,
  paths: {
    policy?: string;
    event?: string;
    trace?: string;
    tests?: string;
  }
): Promise<void> {
  const spinner = startInteractiveSpinner(`Running ${command}...`);

  try {
    if (command === 'validate') {
      await emit('validate', format, async () =>
        runValidate({
          policy: paths.policy ? await readStructuredFile(paths.policy) : undefined,
          event: paths.event ? await readStructuredFile(paths.event) : undefined,
          trace: paths.trace ? await readStructuredFile(paths.trace) : undefined,
          tests: paths.tests ? await readStructuredFile(paths.tests) : undefined,
        })
      );
      finishInteractiveSpinner(spinner, `${command} complete`, false);
      return;
    }

    if (command === 'eval') {
      await emit('eval', format, async () =>
        runEval({
          policy: await readStructuredFile(paths.policy!),
          event: await readStructuredFile(paths.event!),
        })
      );
      finishInteractiveSpinner(spinner, `${command} complete`, false);
      return;
    }

    if (command === 'replay') {
      await emit('replay', format, async () =>
        runReplay({
          policy: await readStructuredFile(paths.policy!),
          trace: await readStructuredFile(paths.trace!),
        })
      );
      finishInteractiveSpinner(spinner, `${command} complete`, false);
      return;
    }

    if (command === 'test') {
      await emit('test', format, async () =>
        runTest({
          policy: await readStructuredFile(paths.policy!),
          tests: await readStructuredFile(paths.tests!),
        })
      );
      finishInteractiveSpinner(spinner, `${command} complete`, false);
      return;
    }

    await emit('redact', format, async () =>
      runRedact({
        policy: await readStructuredFile(paths.policy!),
        event: await readStructuredFile(paths.event!),
      })
    );
    finishInteractiveSpinner(spinner, `${command} complete`, false);
  } catch (error: unknown) {
    finishInteractiveSpinner(spinner, `${command} failed`, true);
    throw error;
  }
}

const program = new Command();

program
  .name('asp')
  .description('Agent Sandbox Policy CLI')
  .version('0.1.1-draft');

program.action(async () => {
  await runInteractiveMode();
});

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

program
  .command('interactive')
  .description('Launch interactive command assistant')
  .action(async () => {
    try {
      await runInteractiveMode();
    } catch (error: unknown) {
      writeError(error);
      process.exitCode = 2;
    }
  });

await program.parseAsync(process.argv);
