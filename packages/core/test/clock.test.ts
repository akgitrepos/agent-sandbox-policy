import { describe, expect, it } from 'vitest';

import { FixedClock } from '../src/utils';

describe('FixedClock', () => {
  it('returns deterministic time and supports advancing', () => {
    const clock = new FixedClock(1000);

    expect(clock.nowMs()).toBe(1000);

    clock.advanceMs(250);
    expect(clock.nowMs()).toBe(1250);

    clock.setNowMs(42);
    expect(clock.nowMs()).toBe(42);
  });
});
