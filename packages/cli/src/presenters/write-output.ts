import type { OutputFormat } from '../types';

export function writeOutput(payload: unknown, format: OutputFormat): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${renderPretty(payload)}\n`);
}

function renderPretty(payload: unknown): string {
  if (payload === null || typeof payload !== 'object') {
    return String(payload);
  }

  const data = payload as Record<string, unknown>;
  const lines: string[] = [];
  lines.push(`command: ${String(data.command ?? 'unknown')}`);
  lines.push(`ok: ${String(data.ok ?? false)}`);

  for (const [key, value] of Object.entries(data)) {
    if (key === 'command' || key === 'ok') {
      continue;
    }

    if (typeof value === 'object') {
      lines.push(`${key}:`);
      lines.push(indent(JSON.stringify(value, null, 2), 2));
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }

  return lines.join('\n');
}

function indent(input: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return input
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}
