import type { OutputFormat } from '../types.js';
import { badge, dim, info, ok, title, warn } from './theme.js';

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
  const command = String(data.command ?? 'unknown');
  const success = Boolean(data.ok);
  const lines: string[] = [];
  lines.push(`${title('ASP')} ${badge(command, success)}`);
  lines.push(dim(`status: ${success ? 'success' : 'failure'}`));

  if (command === 'eval') {
    const result = data.result as Record<string, unknown> | undefined;
    const status = result?.status ? String(result.status) : 'unknown';
    lines.push(`decision: ${status}`);
    if (result?.decision && typeof result.decision === 'object') {
      const decision = result.decision as Record<string, unknown>;
      if (decision.matchedRuleId) {
        lines.push(`${info('matched rule')}: ${String(decision.matchedRuleId)}`);
      }
    }
  }

  if (command === 'test') {
    const report = data.report as Record<string, unknown> | undefined;
    if (report) {
      const passed = Number(report.passed ?? 0);
      const failed = Number(report.failed ?? 0);
      lines.push(`tests: ${ok(String(passed))} passed, ${failed > 0 ? warn(String(failed)) : ok(String(failed))} failed`);
    }
  }

  if (command === 'replay') {
    const replay = data.result as Record<string, unknown> | undefined;
    const summary = replay?.summary as Record<string, unknown> | undefined;
    if (summary) {
      lines.push(`events: ${String(summary.totalEvents ?? 0)}`);
      lines.push(`allow: ${String(summary.allowCount ?? 0)}, deny: ${String(summary.denyCount ?? 0)}`);
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === 'command' || key === 'ok' || key === 'result' || key === 'report') {
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
