import type { DecisionAction } from '../domain/primitives';

export type PolicyFormat = 'json' | 'yaml';

export type Scalar = string | number | boolean | null;

export type Severity = 'low' | 'medium' | 'high';

export type EvaluationMode = 'first_match_wins';

export interface OperatorConstraint {
  readonly in?: readonly Scalar[];
  readonly regex?: string;
  readonly regex_any?: readonly string[];
  readonly starts_with?: string;
  readonly contains?: string;
}

export type MatchValue =
  | Scalar
  | OperatorConstraint
  | {
      readonly [key: string]: MatchValue;
    };

export interface MatchClause {
  readonly stage?: 'request' | 'output';
  readonly tool?: string;
  readonly tool_in?: readonly string[];
  readonly args?: {
    readonly [key: string]: MatchValue;
  };
  readonly context?: {
    readonly [key: string]: MatchValue;
  };
}

export interface ApprovalConfig {
  readonly approver_type: 'human' | 'service';
}

export interface RuleAction {
  readonly decision: DecisionAction;
  readonly approval?: ApprovalConfig;
}

export interface Rule {
  readonly id: string;
  readonly enabled?: boolean;
  readonly match: MatchClause;
  readonly action: RuleAction;
  readonly message?: string;
  readonly severity?: Severity;
}

export interface RateLimitRule {
  readonly id: string;
  readonly enabled?: boolean;
  readonly match: MatchClause;
  readonly limit: {
    readonly scope: 'per_run' | 'global' | 'per_agent' | 'per_tool';
    readonly requests: number;
    readonly per: string;
  };
  readonly on_exceed: {
    readonly decision: 'deny' | 'require_approval';
    readonly message?: string;
  };
}

export interface RedactionPattern {
  readonly regex: string;
  readonly replace: string;
}

export interface TextRegexRedaction {
  readonly mode: 'text_regex';
  readonly patterns: readonly RedactionPattern[];
}

export interface JsonFieldMaskRedaction {
  readonly mode: 'json_field_mask';
  readonly field_names: readonly string[];
  readonly replacement?: string;
}

export type RedactionApply = TextRegexRedaction | JsonFieldMaskRedaction;

export interface RedactionRule {
  readonly id: string;
  readonly enabled?: boolean;
  readonly match: MatchClause;
  readonly apply: RedactionApply;
}

export interface PolicyDocument {
  readonly version: 1;
  readonly name?: string;
  readonly description?: string;
  readonly evaluation: {
    readonly mode: EvaluationMode;
  };
  readonly defaults: {
    readonly decision: 'allow' | 'deny';
    readonly explain?: boolean;
  };
  readonly rules?: readonly Rule[];
  readonly rate_limits?: readonly RateLimitRule[];
  readonly redaction?: readonly RedactionRule[];
}

export interface CompiledOperatorConstraint {
  readonly in?: readonly Scalar[];
  readonly regex?: RegExp;
  readonly regex_any?: readonly RegExp[];
  readonly starts_with?: string;
  readonly contains?: string;
}

export type CompiledMatchValue =
  | Scalar
  | CompiledOperatorConstraint
  | {
      readonly [key: string]: CompiledMatchValue;
    };

export interface CompiledMatchClause {
  readonly stage?: 'request' | 'output';
  readonly tool?: string;
  readonly tool_in?: readonly string[];
  readonly args?: {
    readonly [key: string]: CompiledMatchValue;
  };
  readonly context?: {
    readonly [key: string]: CompiledMatchValue;
  };
}

export interface CompiledRule extends Omit<Rule, 'enabled' | 'match'> {
  readonly enabled: boolean;
  readonly order: number;
  readonly match: CompiledMatchClause;
}

export interface CompiledRateLimitRule extends Omit<RateLimitRule, 'enabled' | 'match'> {
  readonly enabled: boolean;
  readonly order: number;
  readonly match: CompiledMatchClause;
}

export interface CompiledTextRegexPattern {
  readonly source: string;
  readonly regex: RegExp;
  readonly replace: string;
}

export interface CompiledTextRegexRedaction {
  readonly mode: 'text_regex';
  readonly patterns: readonly CompiledTextRegexPattern[];
}

export interface CompiledJsonFieldMaskRedaction {
  readonly mode: 'json_field_mask';
  readonly field_names: readonly string[];
  readonly replacement: string;
}

export type CompiledRedactionApply = CompiledTextRegexRedaction | CompiledJsonFieldMaskRedaction;

export interface CompiledRedactionRule extends Omit<RedactionRule, 'enabled' | 'match' | 'apply'> {
  readonly enabled: boolean;
  readonly order: number;
  readonly match: CompiledMatchClause;
  readonly apply: CompiledRedactionApply;
}

export interface CompiledPolicy {
  readonly version: 1;
  readonly name?: string;
  readonly description?: string;
  readonly evaluation: {
    readonly mode: EvaluationMode;
  };
  readonly defaults: {
    readonly decision: 'allow' | 'deny';
    readonly explain: boolean;
  };
  readonly rules: readonly CompiledRule[];
  readonly rate_limits: readonly CompiledRateLimitRule[];
  readonly redaction: readonly CompiledRedactionRule[];
}
