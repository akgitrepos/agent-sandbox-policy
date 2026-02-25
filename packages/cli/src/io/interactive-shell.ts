import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';

import { CliError } from '../application/cli-error.js';

export type InteractiveCommand = 'validate' | 'eval' | 'replay' | 'test' | 'redact' | 'exit';

export interface InteractiveSelection {
  readonly command: InteractiveCommand;
  readonly format: 'pretty' | 'json';
}

export interface InteractivePaths {
  readonly policy?: string;
  readonly event?: string;
  readonly trace?: string;
  readonly tests?: string;
}

function ensureString(value: unknown, label: string): string {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    throw new CliError('Interactive session cancelled by user.');
  }

  const textValue = String(value).trim();
  if (!textValue) {
    throw new CliError(`${label} is required.`);
  }

  return textValue;
}

export async function promptInteractiveSelection(): Promise<InteractiveSelection> {
  intro('ASP Interactive Console');

  const command = await select({
    message: 'Choose a workflow',
    options: [
      { value: 'validate', label: 'Validate', hint: 'Check policy/events/traces/tests schema validity' },
      { value: 'eval', label: 'Evaluate Event', hint: 'Run one tool event against a policy' },
      { value: 'replay', label: 'Replay Trace', hint: 'Replay trace and inspect summary' },
      { value: 'test', label: 'Run Test Suite', hint: 'Run policy tests and get pass/fail report' },
      { value: 'redact', label: 'Preview Redaction', hint: 'Inspect output redaction behavior' },
      { value: 'exit', label: 'Exit', hint: 'Close interactive mode' },
    ],
  });

  if (isCancel(command)) {
    cancel('Operation cancelled.');
    return { command: 'exit', format: 'pretty' };
  }

  if (command === 'exit') {
    outro('See you soon.');
    return { command: 'exit', format: 'pretty' };
  }

  const format = await select({
    message: 'Output format',
    options: [
      { value: 'pretty', label: 'Pretty', hint: 'Human friendly output' },
      { value: 'json', label: 'JSON', hint: 'Machine readable output' },
    ],
    initialValue: 'pretty',
  });

  if (isCancel(format)) {
    cancel('Operation cancelled.');
    return { command: 'exit', format: 'pretty' };
  }

  return {
    command,
    format: format as 'pretty' | 'json',
  };
}

export async function promptPaths(command: Exclude<InteractiveCommand, 'exit'>): Promise<InteractivePaths> {
  log.info('Tip: use relative or absolute paths.');

  const policy = ensureString(
    await text({
      message: 'Policy path',
      placeholder: 'packages/core/test/fixtures/policy.safe-code-agent.yaml',
    }),
    'Policy path'
  );

  if (command === 'validate') {
    const includeEvent = await confirm({ message: 'Include event validation?', initialValue: true });
    const includeTrace = await confirm({ message: 'Include trace validation?', initialValue: true });
    const includeTests = await confirm({ message: 'Include tests validation?', initialValue: true });

    const event = includeEvent
      ? ensureString(
          await text({
            message: 'Event path',
            placeholder: 'packages/core/test/fixtures/event.rm-rf-request.json',
          }),
          'Event path'
        )
      : undefined;

    const trace = includeTrace
      ? ensureString(
          await text({
            message: 'Trace path',
            placeholder: 'packages/core/test/fixtures/trace.code-agent-run.json',
          }),
          'Trace path'
        )
      : undefined;

    const tests = includeTests
      ? ensureString(
          await text({
            message: 'Tests path',
            placeholder: 'packages/core/test/fixtures/testcase.safe-code-agent.tests.json',
          }),
          'Tests path'
        )
      : undefined;

    return { policy, event, trace, tests };
  }

  if (command === 'eval') {
    const event = ensureString(
      await text({
        message: 'Event path',
        placeholder: 'packages/core/test/fixtures/event.rm-rf-request.json',
      }),
      'Event path'
    );
    return { policy, event };
  }

  if (command === 'replay') {
    const trace = ensureString(
      await text({
        message: 'Trace path',
        placeholder: 'packages/core/test/fixtures/trace.code-agent-run.json',
      }),
      'Trace path'
    );
    return { policy, trace };
  }

  if (command === 'test') {
    const tests = ensureString(
      await text({
        message: 'Tests path',
        placeholder: 'packages/core/test/fixtures/testcase.safe-code-agent.tests.json',
      }),
      'Tests path'
    );
    return { policy, tests };
  }

  const event = ensureString(
    await text({
      message: 'Output event path',
      placeholder: 'packages/core/test/fixtures/event.shell-output-with-secret.json',
    }),
    'Output event path'
  );
  return { policy, event };
}

export function startInteractiveSpinner(message: string): ReturnType<typeof spinner> {
  const s = spinner();
  s.start(message);
  return s;
}

export function finishInteractiveSpinner(
  s: ReturnType<typeof spinner>,
  message: string,
  failed: boolean
): void {
  s.stop(message);
  if (failed) {
    log.error(message);
  }
}
