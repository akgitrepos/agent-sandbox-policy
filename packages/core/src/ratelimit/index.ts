export interface RateLimitSnapshot {
  readonly count: number;
  readonly resetAtMs: number;
}

export interface RateLimitStore {
  incrementAndGet(key: string, windowMs: number, nowMs: number): RateLimitSnapshot;
}

interface CounterEntry {
  readonly count: number;
  readonly resetAtMs: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, CounterEntry>();

  public incrementAndGet(key: string, windowMs: number, nowMs: number): RateLimitSnapshot {
    const current = this.counters.get(key);

    if (!current || nowMs >= current.resetAtMs) {
      const next = {
        count: 1,
        resetAtMs: nowMs + windowMs,
      };
      this.counters.set(key, next);

      return {
        count: next.count,
        resetAtMs: next.resetAtMs,
      };
    }

    const next = {
      count: current.count + 1,
      resetAtMs: current.resetAtMs,
    };
    this.counters.set(key, next);

    return {
      count: next.count,
      resetAtMs: next.resetAtMs,
    };
  }

  public clear(): void {
    this.counters.clear();
  }
}
