import type { ErrorObject } from 'ajv';
import type { SchemaName } from '@asp/schemas';

export interface ValidationIssue {
  readonly schema: SchemaName;
  readonly path: string;
  readonly message: string;
  readonly keyword?: string;
  readonly params?: ErrorObject['params'];
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}
