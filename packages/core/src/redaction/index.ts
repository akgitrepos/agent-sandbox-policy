export interface RedactionMutation {
  readonly path: string;
  readonly strategy: 'text_regex' | 'json_field_mask';
}

export interface RedactionResult<T> {
  readonly output: T;
  readonly mutations: readonly RedactionMutation[];
}
