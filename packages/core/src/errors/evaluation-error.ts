import { AspError } from './asp-error';
import { ASP_ERROR_CODES } from './error-codes';

export class EvaluationError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.EVALUATION_ERROR, message, { details });
    this.name = 'EvaluationError';
  }
}
