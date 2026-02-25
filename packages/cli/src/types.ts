export type OutputFormat = 'pretty' | 'json';

export interface CommandOutput {
  readonly command: string;
  readonly ok: boolean;
}

export interface CommandExecution<T extends CommandOutput> {
  readonly exitCode: number;
  readonly output: T;
}
