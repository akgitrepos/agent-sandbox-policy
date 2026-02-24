import type { AspErrorCode } from './error-codes';

export interface AspErrorOptions {
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;
}

export class AspError extends Error {
  public readonly code: AspErrorCode;
  public readonly details?: Record<string, unknown>;

  public constructor(code: AspErrorCode, message: string, options: AspErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AspError';
    this.code = code;
    this.details = options.details;
  }
}
