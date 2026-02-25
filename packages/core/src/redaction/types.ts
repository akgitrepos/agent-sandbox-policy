import type { CompiledRedactionRule } from '../parser';

export interface RedactionMutation {
  readonly redactionId: string;
  readonly path: string;
  readonly strategy: 'text_regex' | 'json_field_mask';
  readonly beforePreview?: string;
  readonly afterPreview?: string;
  readonly count?: number;
}

export interface RedactionOutcome {
  readonly applied: boolean;
  readonly ruleIds: readonly string[];
  readonly mutations: readonly RedactionMutation[];
  readonly output: unknown;
}

export interface RedactionEvaluationInput {
  readonly output: unknown;
  readonly rules: readonly CompiledRedactionRule[];
  readonly toolName: string;
}
