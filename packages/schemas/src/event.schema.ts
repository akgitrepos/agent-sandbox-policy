import { SCHEMA_IDS } from './schema-ids';
import type { JsonSchema } from './types';

const requestEventSchema: JsonSchema = {
  type: 'object',
  required: ['schema_version', 'event_id', 'run_id', 'stage', 'tool_name', 'arguments', 'timestamp'],
  properties: {
    schema_version: { type: 'string', const: '1' },
    event_id: { type: 'string', minLength: 1 },
    run_id: { type: 'string', minLength: 1 },
    agent_id: { type: 'string', minLength: 1 },
    stage: { const: 'request' },
    tool_name: { type: 'string', minLength: 1 },
    arguments: { type: 'object', additionalProperties: true },
    context: { type: 'object', additionalProperties: true },
    timestamp: { type: 'string', format: 'date-time' },
    meta: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
  not: {
    required: ['output'],
  },
};

const outputEventSchema: JsonSchema = {
  type: 'object',
  required: ['schema_version', 'event_id', 'run_id', 'stage', 'tool_name', 'output', 'timestamp'],
  properties: {
    schema_version: { type: 'string', const: '1' },
    event_id: { type: 'string', minLength: 1 },
    run_id: { type: 'string', minLength: 1 },
    agent_id: { type: 'string', minLength: 1 },
    stage: { const: 'output' },
    tool_name: { type: 'string', minLength: 1 },
    output: {
      anyOf: [
        { type: 'object', additionalProperties: true },
        { type: 'array' },
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
        { type: 'boolean' },
        { type: 'null' },
      ],
    },
    context: { type: 'object', additionalProperties: true },
    timestamp: { type: 'string', format: 'date-time' },
    meta: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
  not: {
    required: ['arguments'],
  },
};

export const eventSchema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: SCHEMA_IDS.event,
  title: 'ASP Tool Event',
  type: 'object',
  oneOf: [requestEventSchema, outputEventSchema],
};
