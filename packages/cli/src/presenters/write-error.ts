import { CliError } from '../application/cli-error';

export function writeError(error: unknown): void {
  if (error instanceof CliError) {
    process.stderr.write(`error: ${error.message}\n`);
    return;
  }

  if (error instanceof Error) {
    process.stderr.write(`error: ${error.message}\n`);
    return;
  }

  process.stderr.write(`error: ${String(error)}\n`);
}
