export const EXIT_CODE = {
  SUCCESS: 0,
  TESTS_FAILED: 1,
  FAILURE: 2,
} as const;

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];
