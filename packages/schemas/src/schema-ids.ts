const SCHEMA_BASE = 'https://agent-sandbox-policy.dev/schemas';

export const SCHEMA_IDS = {
  policy: `${SCHEMA_BASE}/policy.schema.json`,
  event: `${SCHEMA_BASE}/event.schema.json`,
  decision: `${SCHEMA_BASE}/decision.schema.json`,
  trace: `${SCHEMA_BASE}/trace.schema.json`,
  testcase: `${SCHEMA_BASE}/testcase.schema.json`,
} as const;
