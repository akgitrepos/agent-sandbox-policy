import type {
  CompiledMatchClause,
  CompiledMatchValue,
  CompiledOperatorConstraint,
  CompiledRule,
  Scalar,
} from '../parser';

import type { ToolEvent } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCompiledOperatorConstraint(value: CompiledMatchValue): value is CompiledOperatorConstraint {
  if (!isRecord(value)) {
    return false;
  }

  return ['in', 'regex', 'regex_any', 'starts_with', 'contains'].some((key) => key in value);
}

function equalsScalar(left: unknown, right: Scalar): boolean {
  return left === right;
}

function matchOperator(actual: unknown, operator: CompiledOperatorConstraint): boolean {
  if (operator.in && !operator.in.some((expected) => equalsScalar(actual, expected))) {
    return false;
  }

  if (operator.regex) {
    if (typeof actual !== 'string') {
      return false;
    }

    operator.regex.lastIndex = 0;
    if (!operator.regex.test(actual)) {
      return false;
    }
  }

  if (operator.regex_any) {
    if (typeof actual !== 'string') {
      return false;
    }

    const matched = operator.regex_any.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(actual);
    });

    if (!matched) {
      return false;
    }
  }

  if (operator.starts_with) {
    if (typeof actual !== 'string' || !actual.startsWith(operator.starts_with)) {
      return false;
    }
  }

  if (operator.contains) {
    if (typeof actual !== 'string' || !actual.includes(operator.contains)) {
      return false;
    }
  }

  return true;
}

function matchValue(actual: unknown, expected: CompiledMatchValue): boolean {
  if (expected === null || typeof expected !== 'object' || Array.isArray(expected)) {
    return equalsScalar(actual, expected as Scalar);
  }

  if (isCompiledOperatorConstraint(expected)) {
    return matchOperator(actual, expected);
  }

  if (!isRecord(actual)) {
    return false;
  }

  return Object.entries(expected).every(([key, nestedExpected]) =>
    matchValue(actual[key], nestedExpected)
  );
}

function matchContextClause(
  actual: Record<string, unknown> | undefined,
  expected: CompiledMatchClause['context']
): boolean {
  if (!expected) {
    return true;
  }

  if (!actual) {
    return false;
  }

  return Object.entries(expected).every(([key, constraint]) => matchValue(actual[key], constraint));
}

function matchArgsClause(
  event: ToolEvent,
  expected: CompiledMatchClause['args']
): boolean {
  if (!expected) {
    return true;
  }

  if (event.stage !== 'request') {
    return false;
  }

  return Object.entries(expected).every(([key, constraint]) =>
    matchValue(event.arguments[key], constraint)
  );
}

export function ruleMatchesEvent(rule: CompiledRule, event: ToolEvent): boolean {
  const match = rule.match;

  if (match.stage && match.stage !== event.stage) {
    return false;
  }

  if (match.tool && match.tool !== event.tool_name) {
    return false;
  }

  if (match.tool_in && !match.tool_in.includes(event.tool_name)) {
    return false;
  }

  if (!matchArgsClause(event, match.args)) {
    return false;
  }

  if (!matchContextClause(event.context, match.context)) {
    return false;
  }

  return true;
}
