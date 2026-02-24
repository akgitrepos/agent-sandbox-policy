import { describe, expect, it } from 'vitest';

import { stableStringify } from '../src/utils';

describe('stableStringify', () => {
  it('sorts object keys recursively', () => {
    const actual = stableStringify({
      z: 1,
      a: { y: true, x: false },
      b: [{ k: 2, j: 1 }],
    });

    expect(actual).toBe('{"a":{"x":false,"y":true},"b":[{"j":1,"k":2}],"z":1}');
  });
});
