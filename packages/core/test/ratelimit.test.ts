import { describe, expect, it } from 'vitest';

import { InMemoryRateLimitStore } from '../src/ratelimit';

describe('InMemoryRateLimitStore', () => {
  it('starts a new window and increments within it', () => {
    const store = new InMemoryRateLimitStore();

    const first = store.incrementAndGet('shell.exec:user:abc', 1000, 5000);
    const second = store.incrementAndGet('shell.exec:user:abc', 1000, 5500);

    expect(first.count).toBe(1);
    expect(first.resetAtMs).toBe(6000);
    expect(second.count).toBe(2);
    expect(second.resetAtMs).toBe(6000);
  });

  it('resets once the fixed window expires', () => {
    const store = new InMemoryRateLimitStore();

    store.incrementAndGet('shell.exec:user:abc', 1000, 5000);
    const nextWindow = store.incrementAndGet('shell.exec:user:abc', 1000, 6000);

    expect(nextWindow.count).toBe(1);
    expect(nextWindow.resetAtMs).toBe(7000);
  });
});
