export type AspVersion = string;

export type IsoTimestamp = string;

export type DecisionAction = 'allow' | 'deny' | 'require_approval';

export interface ExplainDetails {
  readonly rulesChecked: number;
  readonly matchedRuleId?: string;
}
