import { CliError } from '../application/cli-error';
import { error as errorStyle, title } from './theme';

export function writeError(error: unknown): void {
  if (error instanceof CliError) {
    process.stderr.write(`${title('ASP')} ${errorStyle('error')}: ${error.message}\n`);
    return;
  }

  if (error instanceof Error) {
    process.stderr.write(`${title('ASP')} ${errorStyle('error')}: ${error.message}\n`);
    return;
  }

  process.stderr.write(`${title('ASP')} ${errorStyle('error')}: ${String(error)}\n`);
}
