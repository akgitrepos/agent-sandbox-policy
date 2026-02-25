import type { CompiledRateLimitRule } from '../parser';

import type { ToolEvent } from '../evaluator/types';

function normalize(value: string | undefined): string {
  return value ?? 'unknown';
}

export function buildRateLimitKey(rule: CompiledRateLimitRule, event: ToolEvent): string {
  const prefix = `ratelimit:${rule.id}`;

  switch (rule.limit.scope) {
    case 'per_run':
      return `${prefix}:run:${normalize(event.run_id)}`;
    case 'per_agent':
      return `${prefix}:agent:${normalize(event.agent_id)}`;
    case 'per_tool':
      return `${prefix}:tool:${normalize(event.tool_name)}`;
    case 'global':
      return `${prefix}:global`;
    default:
      return `${prefix}:global`;
  }
}
