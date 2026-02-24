function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const sortedEntries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return Object.fromEntries(sortedEntries.map(([key, item]) => [key, sortValue(item)]));
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}
