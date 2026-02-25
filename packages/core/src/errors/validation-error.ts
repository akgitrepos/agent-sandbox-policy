import { AspError } from './asp-error';
import { ASP_ERROR_CODES } from './error-codes';

export class PolicyValidationError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.POLICY_VALIDATION_ERROR, message, { details });
    this.name = 'PolicyValidationError';
  }
}

export class EventValidationError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.EVENT_VALIDATION_ERROR, message, { details });
    this.name = 'EventValidationError';
  }
}

export class TraceValidationError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.TRACE_VALIDATION_ERROR, message, { details });
    this.name = 'TraceValidationError';
  }
}

export class TestcaseValidationError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.TESTCASE_VALIDATION_ERROR, message, { details });
    this.name = 'TestcaseValidationError';
  }
}
