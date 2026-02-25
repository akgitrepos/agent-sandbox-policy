import type { DecisionAction } from '../domain/primitives';

import type { CompiledPolicy, Severity } from '../parser';
import type { RateLimitEvaluation, RateLimitStore } from '../ratelimit';
import type { RedactionOutcome } from '../redaction';
import type { Clock } from '../utils';

export interface ToolRequestEvent {
  readonly schema_version: '1';
  readonly event_id: string;
  readonly run_id: string;
  readonly agent_id?: string;
  readonly stage: 'request';
  readonly tool_name: string;
  readonly arguments: Record<string, unknown>;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;
  readonly meta?: Record<string, unknown>;
}

export interface ToolOutputEvent {
  readonly schema_version: '1';
  readonly event_id: string;
  readonly run_id: string;
  readonly agent_id?: string;
  readonly stage: 'output';
  readonly tool_name: string;
  readonly output: unknown;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;
  readonly meta?: Record<string, unknown>;
}

export type ToolEvent = ToolRequestEvent | ToolOutputEvent;

export interface DecisionReason {
  readonly code: string;
  readonly message: string;
}

export interface EvaluatorExplain {
  readonly evaluationMode: CompiledPolicy['evaluation']['mode'];
  readonly rulesChecked: number;
  readonly matchedRuleOrder?: number;
}

export interface EvaluatorDecision {
  readonly action: DecisionAction;
  readonly matchedRuleId: string | null;
  readonly severity?: Severity;
  readonly message?: string;
  readonly reasons: readonly DecisionReason[];
  readonly explain: EvaluatorExplain;
}

export type DecisionStatus =
  | 'allow'
  | 'deny'
  | 'require_approval'
  | 'allow_with_redaction'
  | 'deny_rate_limited';

export interface EvaluateEventResult {
  readonly decision: EvaluatorDecision;
  readonly status: DecisionStatus;
  readonly redactedOutput?: unknown;
  readonly rateLimit: RateLimitEvaluation;
  readonly redaction: Omit<RedactionOutcome, 'output'>;
}

export interface EvaluateEventOptions {
  readonly validateEvent?: boolean;
  readonly clock?: Clock;
  readonly rateLimitStore?: RateLimitStore;
}
