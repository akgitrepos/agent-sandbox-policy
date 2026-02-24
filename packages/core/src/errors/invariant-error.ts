import { AspError } from './asp-error';
import { ASP_ERROR_CODES } from './error-codes';

export class InvariantError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.INVARIANT_VIOLATION, message, { details });
    this.name = 'InvariantError';
  }
}
