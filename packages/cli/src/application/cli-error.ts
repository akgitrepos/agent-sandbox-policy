export class CliError extends Error {
  public readonly details?: Record<string, unknown>;

  public constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CliError';
    this.details = details;
  }
}
