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
