import type { DecisionAction, ExplainDetails } from '../domain/primitives';

export interface EvaluatorDecision {
  readonly action: DecisionAction;
  readonly explain: ExplainDetails;
}
