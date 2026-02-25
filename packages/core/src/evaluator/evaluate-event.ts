import type { CompiledPolicy, CompiledRule } from '../parser';
import { createSchemaValidator } from '../validation';

import { ruleMatchesEvent } from './matcher';
import type { EvaluateEventOptions, EvaluatorDecision, ToolEvent } from './types';

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
  if (options.validateEvent !== false) {
    sharedSchemaValidator.assertEvent(eventCandidate);
  }

  const event = toToolEvent(eventCandidate);

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
