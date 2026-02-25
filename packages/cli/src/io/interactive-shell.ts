import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { CliError } from '../application/cli-error';

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

export async function promptInteractiveSelection(): Promise<InteractiveSelection> {
  const rl = createInterface({ input, output });

  try {
    output.write('\nASP Interactive\n');
    output.write('  1) validate\n');
    output.write('  2) eval\n');
    output.write('  3) replay\n');
    output.write('  4) test\n');
    output.write('  5) redact\n');
    output.write('  0) exit\n\n');

    const choice = (await rl.question('Select command [0-5]: ')).trim();
    const formatValue = (await rl.question('Output format [pretty/json] (default pretty): ')).trim();

    const format = formatValue === 'json' ? 'json' : 'pretty';

    const command = mapChoice(choice);

    return {
      command,
      format,
    };
  } finally {
    rl.close();
  }
}

export async function promptPaths(command: Exclude<InteractiveCommand, 'exit'>): Promise<InteractivePaths> {
  const rl = createInterface({ input, output });

  try {
    const policy = await askRequired(rl, 'Policy path');

    if (command === 'validate') {
      const event = await askOptional(rl, 'Event path (optional)');
      const trace = await askOptional(rl, 'Trace path (optional)');
      const tests = await askOptional(rl, 'Tests path (optional)');
      return { policy, event, trace, tests };
    }

    if (command === 'eval') {
      const event = await askRequired(rl, 'Event path');
      return { policy, event };
    }

    if (command === 'replay') {
      const trace = await askRequired(rl, 'Trace path');
      return { policy, trace };
    }

    if (command === 'test') {
      const tests = await askRequired(rl, 'Tests path');
      return { policy, tests };
    }

    const event = await askRequired(rl, 'Output event path');
    return { policy, event };
  } finally {
    rl.close();
  }
}

function mapChoice(value: string): InteractiveCommand {
  const normalized = value.trim();

  if (normalized === '1' || normalized === 'validate') return 'validate';
  if (normalized === '2' || normalized === 'eval') return 'eval';
  if (normalized === '3' || normalized === 'replay') return 'replay';
  if (normalized === '4' || normalized === 'test') return 'test';
  if (normalized === '5' || normalized === 'redact') return 'redact';
  if (normalized === '0' || normalized === 'exit') return 'exit';

  throw new CliError(`Unknown selection '${value}'.`);
}

async function askRequired(
  rl: ReturnType<typeof createInterface>,
  label: string
): Promise<string> {
  const value = (await rl.question(`${label}: `)).trim();
  if (!value) {
    throw new CliError(`${label} is required.`);
  }

  return value;
}

async function askOptional(
  rl: ReturnType<typeof createInterface>,
  label: string
): Promise<string | undefined> {
  const value = (await rl.question(`${label}: `)).trim();
  return value || undefined;
}
