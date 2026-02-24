export type PolicyFormat = 'json' | 'yaml';

export interface PolicySource {
  readonly raw: string;
  readonly format: PolicyFormat;
}
