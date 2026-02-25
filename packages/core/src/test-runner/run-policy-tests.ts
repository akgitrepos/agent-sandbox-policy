import { TestRunnerError } from '../errors';
import type { EvaluateEventResult } from '../evaluator';
import { evaluateEventResult } from '../evaluator';
import type { CompiledPolicy } from '../parser';
import { InMemoryRateLimitStore } from '../ratelimit';
import { FixedClock } from '../utils';
import { createSchemaValidator } from '../validation';

import type {
  PolicyTestCase,
  PolicyTestExpected,
  PolicyTestReport,
  PolicyTestResult,
  PolicyTestSuite,
} from './types';

const sharedSchemaValidator = createSchemaValidator();

function assertIncludes(haystack: readonly string[], expected: readonly string[]): boolean {
  return expected.every((value) => haystack.includes(value));
}

function evaluateAssertions(expected: PolicyTestExpected, actual: EvaluateEventResult): string[] {
  const failures: string[] = [];

  if (expected.status && actual.status !== expected.status) {
    failures.push(`status expected '${expected.status}' but received '${actual.status}'`);
  }

  if (expected.matched_rule_id !== undefined && actual.decision.matchedRuleId !== expected.matched_rule_id) {
    failures.push(
      `matched_rule_id expected '${expected.matched_rule_id}' but received '${actual.decision.matchedRuleId}'`
    );
  }

  if (expected.message_contains) {
    const message = actual.decision.message ?? '';
    if (!message.includes(expected.message_contains)) {
      failures.push(`message did not include '${expected.message_contains}'`);
    }
  }

  if (expected.reason_codes_includes) {
    const actualReasonCodes = actual.decision.reasons.map((reason) => reason.code);
    if (!assertIncludes(actualReasonCodes, expected.reason_codes_includes)) {
      failures.push(
        `reason codes missing expected subset '${expected.reason_codes_includes.join(',')}'`
      );
    }
  }

  if (expected.approval_required !== undefined) {
    const actualApproval = actual.decision.action === 'require_approval';
    if (actualApproval !== expected.approval_required) {
      failures.push(
        `approval_required expected '${expected.approval_required}' but received '${actualApproval}'`
      );
    }
  }

  if (expected.redaction_applied !== undefined && actual.redaction.applied !== expected.redaction_applied) {
    failures.push(
      `redaction_applied expected '${expected.redaction_applied}' but received '${actual.redaction.applied}'`
    );
  }

  if (
    expected.rate_limit_exceeded !== undefined &&
    actual.rateLimit.exceeded !== expected.rate_limit_exceeded
  ) {
    failures.push(
      `rate_limit_exceeded expected '${expected.rate_limit_exceeded}' but received '${actual.rateLimit.exceeded ?? false}'`
    );
  }

  if (expected.severity !== undefined && actual.decision.severity !== expected.severity) {
    failures.push(
      `severity expected '${expected.severity}' but received '${actual.decision.severity ?? 'undefined'}'`
    );
  }

  return failures;
}

function evaluateTestCase(policy: CompiledPolicy, testCase: PolicyTestCase): PolicyTestResult {
  const timestampMs = Date.parse(testCase.event.timestamp);
  if (!Number.isFinite(timestampMs)) {
    throw new TestRunnerError(`Test case '${testCase.id}' has invalid event timestamp.`, {
      id: testCase.id,
      timestamp: testCase.event.timestamp,
    });
  }

  const result = evaluateEventResult(policy, testCase.event, {
    validateEvent: false,
    rateLimitStore: new InMemoryRateLimitStore(),
    clock: new FixedClock(timestampMs),
  });

  const assertionFailures = evaluateAssertions(testCase.expected, result);

  return {
    id: testCase.id,
    passed: assertionFailures.length === 0,
    assertionFailures,
  };
}

export function runPolicyTests(policy: CompiledPolicy, suiteCandidate: unknown): PolicyTestReport {
  sharedSchemaValidator.assertTestcase(suiteCandidate);

  const suite = suiteCandidate as PolicyTestSuite;
  const results = suite.tests.map((testCase) => evaluateTestCase(policy, testCase));
  const passed = results.filter((result) => result.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
