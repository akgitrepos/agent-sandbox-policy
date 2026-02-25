import type { JsonSchema, SchemaName } from './types';

import { decisionSchema } from './decision.schema';
import { eventSchema } from './event.schema';
import { policySchema } from './policy.schema';
import { testcaseSchema } from './testcase.schema';
import { traceSchema } from './trace.schema';

export const schemaCatalog: Record<SchemaName, JsonSchema> = {
  policy: policySchema,
  event: eventSchema,
  decision: decisionSchema,
  trace: traceSchema,
  testcase: testcaseSchema,
};

export function getSchema(schemaName: SchemaName): JsonSchema {
  return schemaCatalog[schemaName];
}
