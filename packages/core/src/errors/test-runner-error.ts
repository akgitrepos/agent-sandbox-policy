import { AspError } from './asp-error';
import { ASP_ERROR_CODES } from './error-codes';

export class TestRunnerError extends AspError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(ASP_ERROR_CODES.TEST_RUNNER_ERROR, message, { details });
    this.name = 'TestRunnerError';
  }
}
