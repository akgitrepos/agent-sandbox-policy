import type { CompiledPolicy } from '../parser';
import type { Clock } from '../utils';

import type { ToolEvent } from '../evaluator/types';
import { matchClauseAgainstEvent } from '../evaluator/matcher';

import { parseDurationToMs } from './duration';
import { buildRateLimitKey } from './key';
import type { RateLimitStore } from './store';

export interface RateLimitEvaluation {
  readonly applied: boolean;
  readonly ruleId?: string;
  readonly exceeded?: boolean;
  readonly remaining?: number;
  readonly windowMs?: number;
  readonly overrideAction?: 'deny' | 'require_approval';
  readonly message?: string;
}

export function evaluateRateLimits(
  policy: CompiledPolicy,
  event: ToolEvent,
  store: RateLimitStore,
  clock: Clock
): RateLimitEvaluation {
  const enabledRules = policy.rate_limits.filter((rule) => rule.enabled);

  for (const rule of enabledRules) {
    if (!matchClauseAgainstEvent(rule.match, event)) {
      continue;
    }

    const windowMs = parseDurationToMs(rule.limit.per);
    const key = buildRateLimitKey(rule, event);
    const snapshot = store.incrementAndGet(key, windowMs, clock.nowMs());
    const exceeded = snapshot.count > rule.limit.requests;

    if (exceeded) {
      return {
        applied: true,
        ruleId: rule.id,
        exceeded: true,
        remaining: 0,
        windowMs,
        overrideAction: rule.on_exceed.decision,
        message: rule.on_exceed.message,
      };
    }

    return {
      applied: true,
      ruleId: rule.id,
      exceeded: false,
      remaining: Math.max(0, rule.limit.requests - snapshot.count),
      windowMs,
    };
  }

  return {
    applied: false,
  };
}
