import { SCHEMA_IDS } from './schema-ids';
import type { JsonSchema } from './types';

import { eventSchema } from './event.schema';

export const traceSchema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: SCHEMA_IDS.trace,
  title: 'ASP Run Trace',
  type: 'object',
  required: ['schema_version', 'trace_id', 'run_id', 'events'],
  properties: {
    schema_version: { type: 'string', const: '1' },
    trace_id: { type: 'string', minLength: 1 },
    run_id: { type: 'string', minLength: 1 },
    events: {
      type: 'array',
      minItems: 1,
      items: eventSchema,
    },
    meta: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};
