import { PolicyCompilationError } from '../errors';

import type {
  CompiledJsonFieldMaskRedaction,
  CompiledMatchClause,
  CompiledMatchValue,
  CompiledOperatorConstraint,
  CompiledPolicy,
  CompiledRateLimitRule,
  CompiledRedactionApply,
  CompiledRedactionRule,
  CompiledRule,
  CompiledTextRegexPattern,
  MatchClause,
  MatchValue,
  OperatorConstraint,
  PolicyDocument,
  RedactionApply,
  RedactionRule,
  Rule,
  RateLimitRule,
  Scalar,
} from './types';

function isOperatorConstraint(value: MatchValue): value is OperatorConstraint {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return ['in', 'regex', 'regex_any', 'starts_with', 'contains'].some((key) => key in value);
}

function compileRegex(pattern: string, path: string): RegExp {
  const inlineFlagsMatch = pattern.match(/^\(\?([gimsuy]+)\)/);
  const flags = inlineFlagsMatch ? inlineFlagsMatch[1] : '';
  const source = inlineFlagsMatch ? pattern.slice(inlineFlagsMatch[0].length) : pattern;

  try {
    return new RegExp(source, flags);
  } catch (error: unknown) {
    throw new PolicyCompilationError(`Invalid regex at ${path}.`, {
      path,
      pattern,
      source,
      flags,
      cause: error,
    });
  }
}

function compileOperatorConstraint(operator: OperatorConstraint, path: string): CompiledOperatorConstraint {
  return {
    in: operator.in,
    regex: operator.regex ? compileRegex(operator.regex, `${path}.regex`) : undefined,
    regex_any: operator.regex_any
      ? operator.regex_any.map((pattern, index) =>
          compileRegex(pattern, `${path}.regex_any[${index}]`)
        )
      : undefined,
    starts_with: operator.starts_with,
    contains: operator.contains,
  };
}

function compileMatchValue(value: MatchValue, path: string): CompiledMatchValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value as Scalar;
  }

  if (isOperatorConstraint(value)) {
    return compileOperatorConstraint(value, path);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, compileMatchValue(nested, `${path}.${key}`)])
  );
}

function compileMatchClause(match: MatchClause, path: string): CompiledMatchClause {
  return {
    stage: match.stage,
    tool: match.tool,
    tool_in: match.tool_in,
    args: match.args
      ? Object.fromEntries(
          Object.entries(match.args).map(([key, value]) => [
            key,
            compileMatchValue(value, `${path}.args.${key}`),
          ])
        )
      : undefined,
    context: match.context
      ? Object.fromEntries(
          Object.entries(match.context).map(([key, value]) => [
            key,
            compileMatchValue(value, `${path}.context.${key}`),
          ])
        )
      : undefined,
  };
}

function compileRule(rule: Rule, order: number): CompiledRule {
  return {
    ...rule,
    enabled: rule.enabled ?? true,
    order,
    match: compileMatchClause(rule.match, `rules[${order - 1}].match`),
  };
}

function compileRateLimitRule(rule: RateLimitRule, order: number): CompiledRateLimitRule {
  return {
    ...rule,
    enabled: rule.enabled ?? true,
    order,
    match: compileMatchClause(rule.match, `rate_limits[${order - 1}].match`),
  };
}

function compileTextRegexPatterns(patterns: readonly { regex: string; replace: string }[], path: string): CompiledTextRegexPattern[] {
  return patterns.map((pattern, index) => ({
    source: pattern.regex,
    regex: compileRegex(pattern.regex, `${path}[${index}].regex`),
    replace: pattern.replace,
  }));
}

function compileRedactionApply(apply: RedactionApply, path: string): CompiledRedactionApply {
  if (apply.mode === 'text_regex') {
    return {
      mode: 'text_regex',
      patterns: compileTextRegexPatterns(apply.patterns, `${path}.patterns`),
    };
  }

  const jsonFieldMask: CompiledJsonFieldMaskRedaction = {
    mode: 'json_field_mask',
    field_names: apply.field_names,
    replacement: apply.replacement ?? '[REDACTED]',
  };

  return jsonFieldMask;
}

function compileRedactionRule(rule: RedactionRule, order: number): CompiledRedactionRule {
  return {
    ...rule,
    enabled: rule.enabled ?? true,
    order,
    match: compileMatchClause(rule.match, `redaction[${order - 1}].match`),
    apply: compileRedactionApply(rule.apply, `redaction[${order - 1}].apply`),
  };
}

export function compilePolicy(policy: PolicyDocument): CompiledPolicy {
  const rules = (policy.rules ?? []).map((rule, index) => compileRule(rule, index + 1));
  const rateLimits = (policy.rate_limits ?? []).map((rule, index) =>
    compileRateLimitRule(rule, index + 1)
  );
  const redaction = (policy.redaction ?? []).map((rule, index) =>
    compileRedactionRule(rule, index + 1)
  );

  return {
    version: policy.version,
    name: policy.name,
    description: policy.description,
    evaluation: {
      mode: policy.evaluation.mode,
    },
    defaults: {
      decision: policy.defaults.decision,
      explain: policy.defaults.explain ?? true,
    },
    rules,
    rate_limits: rateLimits,
    redaction,
  };
}
