import { AspError } from './asp-error';
import { ASP_ERROR_CODES } from './error-codes';

export class PolicyCompilationError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.POLICY_COMPILATION_ERROR, message, { details });
    this.name = 'PolicyCompilationError';
  }
}
