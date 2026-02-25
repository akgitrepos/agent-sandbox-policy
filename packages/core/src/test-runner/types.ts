import type { ToolEvent } from '../evaluator';

export interface PolicyTestExpected {
  readonly status?: 'allow' | 'deny' | 'require_approval' | 'allow_with_redaction' | 'deny_rate_limited';
  readonly matched_rule_id?: string | null;
  readonly message_contains?: string;
  readonly reason_codes_includes?: readonly string[];
  readonly approval_required?: boolean;
  readonly redaction_applied?: boolean;
  readonly rate_limit_exceeded?: boolean;
  readonly severity?: 'low' | 'medium' | 'high';
}

export interface PolicyTestCase {
  readonly id: string;
  readonly description?: string;
  readonly event: ToolEvent;
  readonly expected: PolicyTestExpected;
  readonly notes?: string;
}

export interface PolicyTestSuite {
  readonly schema_version: '1';
  readonly tests: readonly PolicyTestCase[];
  readonly meta?: Record<string, unknown>;
}

export interface PolicyTestResult {
  readonly id: string;
  readonly passed: boolean;
  readonly assertionFailures: readonly string[];
}

export interface PolicyTestReport {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly PolicyTestResult[];
}
