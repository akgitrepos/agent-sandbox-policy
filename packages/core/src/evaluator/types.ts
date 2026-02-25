import type { DecisionAction } from '../domain/primitives';

import type { CompiledPolicy, Severity } from '../parser';

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

export interface EvaluateEventOptions {
  readonly validateEvent?: boolean;
}
