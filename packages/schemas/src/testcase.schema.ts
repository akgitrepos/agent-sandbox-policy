import { SCHEMA_IDS } from './schema-ids';
import type { JsonSchema } from './types';

import { eventSchema } from './event.schema';

export const testcaseSchema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: SCHEMA_IDS.testcase,
  title: 'ASP Policy Test Suite',
  type: 'object',
  required: ['schema_version', 'tests'],
  properties: {
    schema_version: { type: 'string', const: '1' },
    tests: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'event', 'expected'],
        properties: {
          id: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          event: eventSchema,
          expected: {
            type: 'object',
            minProperties: 1,
            properties: {
              status: {
                type: 'string',
                enum: ['allow', 'deny', 'require_approval', 'allow_with_redaction', 'deny_rate_limited'],
              },
              matched_rule_id: {
                anyOf: [
                  { type: 'string', minLength: 1 },
                  { type: 'null' },
                ],
              },
              message_contains: { type: 'string' },
              reason_codes_includes: {
                type: 'array',
                minItems: 1,
                items: { type: 'string', minLength: 1 },
              },
              approval_required: { type: 'boolean' },
              redaction_applied: { type: 'boolean' },
              rate_limit_exceeded: { type: 'boolean' },
              severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            additionalProperties: false,
          },
          notes: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    meta: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};
