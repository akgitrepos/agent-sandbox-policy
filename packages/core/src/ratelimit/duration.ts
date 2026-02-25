import { EvaluationError } from '../errors';

const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/;

const UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationToMs(duration: string): number {
  const match = DURATION_PATTERN.exec(duration);

  if (!match) {
    throw new EvaluationError(`Invalid duration string '${duration}'.`, {
      duration,
    });
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multiplier = UNIT_TO_MS[unit];

  return amount * multiplier;
}
