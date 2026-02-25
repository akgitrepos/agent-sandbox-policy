import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  SCHEMA_IDS,
  SCHEMA_NAMES,
  getSchema,
  type SchemaName,
} from '@asp/schemas';

import {
  EventValidationError,
  PolicyValidationError,
  TestcaseValidationError,
  TraceValidationError,
} from '../errors';

import type { ValidationIssue, ValidationResult } from './types';

type ValidatorMap = Record<SchemaName, ValidateFunction<unknown>>;

function toIssues(schemaName: SchemaName, validate: ValidateFunction<unknown>): ValidationIssue[] {
  const issues = validate.errors ?? [];

  return issues.map((issue) => ({
    schema: schemaName,
    path: issue.instancePath || '/',
    message: issue.message ?? 'validation failed',
    keyword: issue.keyword,
    params: issue.params,
  }));
}

export class SchemaValidator {
  private readonly validators: ValidatorMap;

  public constructor() {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      strictRequired: false,
      allowUnionTypes: true,
    });

    addFormats(ajv);

    for (const schemaName of SCHEMA_NAMES) {
      ajv.addSchema(getSchema(schemaName), SCHEMA_IDS[schemaName]);
    }

    this.validators = {
      policy: ajv.getSchema(SCHEMA_IDS.policy)!,
      event: ajv.getSchema(SCHEMA_IDS.event)!,
      decision: ajv.getSchema(SCHEMA_IDS.decision)!,
      trace: ajv.getSchema(SCHEMA_IDS.trace)!,
      testcase: ajv.getSchema(SCHEMA_IDS.testcase)!,
    };
  }

  public validate(schemaName: SchemaName, candidate: unknown): ValidationResult {
    const validate = this.validators[schemaName];
    const valid = validate(candidate);

    return {
      valid,
      issues: valid ? [] : toIssues(schemaName, validate),
    };
  }

  public assertPolicy(candidate: unknown): void {
    const result = this.validate('policy', candidate);

    if (!result.valid) {
      throw new PolicyValidationError('Policy validation failed.', {
        issues: result.issues,
      });
    }
  }

  public assertEvent(candidate: unknown): void {
    const result = this.validate('event', candidate);

    if (!result.valid) {
      throw new EventValidationError('Event validation failed.', {
        issues: result.issues,
      });
    }
  }

  public assertTrace(candidate: unknown): void {
    const result = this.validate('trace', candidate);

    if (!result.valid) {
      throw new TraceValidationError('Trace validation failed.', {
        issues: result.issues,
      });
    }
  }

  public assertTestcase(candidate: unknown): void {
    const result = this.validate('testcase', candidate);

    if (!result.valid) {
      throw new TestcaseValidationError('Testcase validation failed.', {
        issues: result.issues,
      });
    }
  }
}

export function createSchemaValidator(): SchemaValidator {
  return new SchemaValidator();
}
