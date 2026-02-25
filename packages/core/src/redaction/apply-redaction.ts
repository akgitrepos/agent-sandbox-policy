import type {
  CompiledJsonFieldMaskRedaction,
  CompiledRedactionRule,
  CompiledTextRegexPattern,
} from '../parser';

import type {
  RedactionEvaluationInput,
  RedactionMutation,
  RedactionOutcome,
} from './types';

function asPreview(value: unknown): string {
  if (typeof value === 'string') {
    return value.slice(0, 120);
  }

  return JSON.stringify(value).slice(0, 120);
}

function cloneUnknown<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function countMatches(pattern: RegExp, value: string): number {
  const hasGlobal = pattern.flags.includes('g');
  const globalRegex = hasGlobal ? new RegExp(pattern.source, pattern.flags) : new RegExp(pattern.source, `${pattern.flags}g`);

  return Array.from(value.matchAll(globalRegex)).length;
}

function applyPatternToString(
  value: string,
  pattern: CompiledTextRegexPattern,
  redactionId: string,
  path: string
): { value: string; mutation?: RedactionMutation } {
  const matchCount = countMatches(pattern.regex, value);

  if (matchCount === 0) {
    return { value };
  }

  const replaced = value.replace(pattern.regex, pattern.replace);

  return {
    value: replaced,
    mutation: {
      redactionId,
      path,
      strategy: 'text_regex',
      beforePreview: asPreview(value),
      afterPreview: asPreview(replaced),
      count: matchCount,
    },
  };
}

function applyTextRegexRecursively(
  input: unknown,
  patterns: readonly CompiledTextRegexPattern[],
  redactionId: string,
  path: string,
  mutations: RedactionMutation[]
): unknown {
  if (typeof input === 'string') {
    let updated = input;

    for (const pattern of patterns) {
      const result = applyPatternToString(updated, pattern, redactionId, path);
      updated = result.value;
      if (result.mutation) {
        mutations.push(result.mutation);
      }
    }

    return updated;
  }

  if (Array.isArray(input)) {
    return input.map((item, index) =>
      applyTextRegexRecursively(item, patterns, redactionId, `${path}[${index}]`, mutations)
    );
  }

  if (input !== null && typeof input === 'object') {
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      const childPath = path ? `${path}.${key}` : key;
      next[key] = applyTextRegexRecursively(value, patterns, redactionId, childPath, mutations);
    }

    return next;
  }

  return input;
}

function applyJsonFieldMaskRecursively(
  input: unknown,
  config: CompiledJsonFieldMaskRedaction,
  redactionId: string,
  path: string,
  mutations: RedactionMutation[]
): unknown {
  if (Array.isArray(input)) {
    return input.map((item, index) =>
      applyJsonFieldMaskRecursively(item, config, redactionId, `${path}[${index}]`, mutations)
    );
  }

  if (input === null || typeof input !== 'object') {
    return input;
  }

  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const childPath = path ? `${path}.${key}` : key;

    if (config.field_names.includes(key)) {
      next[key] = config.replacement;
      mutations.push({
        redactionId,
        path: childPath,
        strategy: 'json_field_mask',
        beforePreview: asPreview(value),
        afterPreview: asPreview(config.replacement),
        count: 1,
      });
      continue;
    }

    next[key] = applyJsonFieldMaskRecursively(value, config, redactionId, childPath, mutations);
  }

  return next;
}

function redactionRuleMatches(rule: CompiledRedactionRule, toolName: string): boolean {
  if (rule.match.stage && rule.match.stage !== 'output') {
    return false;
  }

  if (rule.match.tool && rule.match.tool !== toolName) {
    return false;
  }

  if (rule.match.tool_in && !rule.match.tool_in.includes(toolName)) {
    return false;
  }

  return true;
}

function applyRule(rule: CompiledRedactionRule, output: unknown, mutations: RedactionMutation[]): unknown {
  if (rule.apply.mode === 'text_regex') {
    return applyTextRegexRecursively(output, rule.apply.patterns, rule.id, 'output', mutations);
  }

  return applyJsonFieldMaskRecursively(output, rule.apply, rule.id, 'output', mutations);
}

export function applyRedactionRules(input: RedactionEvaluationInput): RedactionOutcome {
  const enabledRules = input.rules.filter((rule) => rule.enabled);
  const applicableRules = enabledRules.filter((rule) => redactionRuleMatches(rule, input.toolName));

  if (applicableRules.length === 0) {
    return {
      applied: false,
      ruleIds: [],
      mutations: [],
      output: input.output,
    };
  }

  let output = cloneUnknown(input.output);
  const mutations: RedactionMutation[] = [];
  const appliedRuleIds: string[] = [];

  for (const rule of applicableRules) {
    const mutationCountBefore = mutations.length;
    output = applyRule(rule, output, mutations);

    if (mutations.length > mutationCountBefore) {
      appliedRuleIds.push(rule.id);
    }
  }

  return {
    applied: mutations.length > 0,
    ruleIds: appliedRuleIds,
    mutations,
    output,
  };
}
