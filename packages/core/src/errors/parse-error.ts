import { AspError } from './asp-error';
import { ASP_ERROR_CODES } from './error-codes';

export class ParseError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.PARSE_ERROR, message, { details });
    this.name = 'ParseError';
  }
}
