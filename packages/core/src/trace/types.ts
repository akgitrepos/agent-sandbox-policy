import type { EvaluateEventResult, ToolEvent } from '../evaluator';

export interface RunTrace {
  readonly schema_version: '1';
  readonly trace_id: string;
  readonly run_id: string;
  readonly events: readonly ToolEvent[];
  readonly meta?: Record<string, unknown>;
}

export interface ReplayEventResult {
  readonly eventId: string;
  readonly index: number;
  readonly result: EvaluateEventResult;
}

export interface ReplaySummary {
  readonly totalEvents: number;
  readonly allowCount: number;
  readonly denyCount: number;
  readonly requireApprovalCount: number;
  readonly allowWithRedactionCount: number;
  readonly denyRateLimitedCount: number;
}

export interface ReplayResult {
  readonly traceId: string;
  readonly runId: string;
  readonly events: readonly ReplayEventResult[];
  readonly summary: ReplaySummary;
}
