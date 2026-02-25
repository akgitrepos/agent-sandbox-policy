import type { CompiledPolicy, CompiledRule } from '../parser';
import { evaluateRateLimits, InMemoryRateLimitStore } from '../ratelimit';
import { applyRedactionRules } from '../redaction';
import type { RedactionMutation, RedactionOutcome } from '../redaction';
import { SystemClock } from '../utils';
import { createSchemaValidator } from '../validation';

import { ruleMatchesEvent } from './matcher';
import type {
  EvaluateEventOptions,
  EvaluateEventResult,
  EvaluatorDecision,
  ToolEvent,
} from './types';

const sharedSchemaValidator = createSchemaValidator();

function toToolEvent(candidate: unknown): ToolEvent {
  return candidate as ToolEvent;
}

function buildRuleMatchReason(rule: CompiledRule): string {
  return `Rule '${rule.id}' matched.`;
}

export function evaluateEvent(
  policy: CompiledPolicy,
  eventCandidate: unknown,
  options: EvaluateEventOptions = {}
): EvaluatorDecision {
  return evaluateEventResult(policy, eventCandidate, options).decision;
}

function evaluateBaseDecision(policy: CompiledPolicy, event: ToolEvent): EvaluatorDecision {
  const activeRules = policy.rules.filter((rule) => rule.enabled);

  let checkedRules = 0;
  let matchedRule: CompiledRule | undefined;

  for (const rule of activeRules) {
    checkedRules += 1;

    if (ruleMatchesEvent(rule, event)) {
      matchedRule = rule;
      break;
    }
  }

  if (matchedRule) {
    const reasons = [
      {
        code: 'RULE_MATCH',
        message: buildRuleMatchReason(matchedRule),
      },
    ];

    if (matchedRule.action.decision === 'require_approval') {
      reasons.push({
        code: 'APPROVAL_REQUIRED',
        message: `Rule '${matchedRule.id}' requires approval.`,
      });
    }

    return {
      action: matchedRule.action.decision,
      matchedRuleId: matchedRule.id,
      severity: matchedRule.severity,
      message: matchedRule.message,
      reasons,
      explain: {
        evaluationMode: policy.evaluation.mode,
        rulesChecked: checkedRules,
        matchedRuleOrder: matchedRule.order,
      },
    };
  }

  return {
    action: policy.defaults.decision,
    matchedRuleId: null,
    reasons: [
      {
        code: 'DEFAULT_DECISION',
        message: 'No rule matched; applied policy default decision.',
      },
    ],
    explain: {
      evaluationMode: policy.evaluation.mode,
      rulesChecked: checkedRules,
    },
  };
}

export function evaluateEventResult(
  policy: CompiledPolicy,
  eventCandidate: unknown,
  options: EvaluateEventOptions = {}
): EvaluateEventResult {
  if (options.validateEvent !== false) {
    sharedSchemaValidator.assertEvent(eventCandidate);
  }

  const event = toToolEvent(eventCandidate);
  const clock = options.clock ?? new SystemClock();
  const rateLimitStore = options.rateLimitStore ?? new InMemoryRateLimitStore();

  const baseDecision = evaluateBaseDecision(policy, event);

  const rateLimit = evaluateRateLimits(policy, event, rateLimitStore, clock);
  let action =
    rateLimit.exceeded && rateLimit.overrideAction ? rateLimit.overrideAction : baseDecision.action;
  const reasons = [...baseDecision.reasons];

  if (rateLimit.exceeded && rateLimit.ruleId) {
    reasons.push({
      code: 'RATE_LIMIT_EXCEEDED',
      message:
        rateLimit.message ?? `Rate limit rule '${rateLimit.ruleId}' exceeded and decision overridden.`,
    });
  }

  let redactionOutput: unknown;
  const redactionMutations: RedactionMutation[] = [];
  let redaction: Omit<RedactionOutcome, 'output'> = {
    applied: false,
    ruleIds: [] as string[],
    mutations: redactionMutations,
  };

  if (event.stage === 'output') {
    const redactionResult = applyRedactionRules({
      output: event.output,
      rules: policy.redaction,
      toolName: event.tool_name,
    });
    redactionOutput = redactionResult.output;
    redaction = {
      applied: redactionResult.applied,
      ruleIds: [...redactionResult.ruleIds],
      mutations: redactionResult.mutations,
    };

    if (redactionResult.applied) {
      reasons.push({
        code: 'REDACTION_APPLIED',
        message: `Applied redaction rules: ${redactionResult.ruleIds.join(', ') || 'unknown'}.`,
      });
    }
  }

  const decision: EvaluatorDecision = {
    ...baseDecision,
    action,
    reasons,
  };

  let status: EvaluateEventResult['status'] = action;

  if (rateLimit.exceeded && decision.action === 'deny') {
    status = 'deny_rate_limited';
  }

  if (status === 'allow' && redaction.applied) {
    status = 'allow_with_redaction';
  }

  return {
    decision,
    status,
    redactedOutput: redactionOutput,
    rateLimit,
    redaction,
  };
}
