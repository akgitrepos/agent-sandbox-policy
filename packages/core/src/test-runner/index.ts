export interface PolicyTestResult {
  readonly name: string;
  readonly passed: boolean;
  readonly message?: string;
}
