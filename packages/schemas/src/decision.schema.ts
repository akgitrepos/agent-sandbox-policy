import { SCHEMA_IDS } from './schema-ids';
import type { JsonSchema } from './types';

export const decisionSchema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: SCHEMA_IDS.decision,
  title: 'ASP Policy Decision',
  type: 'object',
  required: ['schema_version', 'decision_id', 'event_id', 'run_id', 'status', 'reasons', 'timestamp'],
  properties: {
    schema_version: { type: 'string', const: '1' },
    decision_id: { type: 'string', minLength: 1 },
    event_id: { type: 'string', minLength: 1 },
    run_id: { type: 'string', minLength: 1 },
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
    reasons: {
      type: 'array',
      items: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
    message: { type: 'string' },
    rate_limit: {
      type: 'object',
      required: ['applied'],
      properties: {
        applied: { type: 'boolean' },
        rule_id: { type: 'string' },
        exceeded: { type: 'boolean' },
        remaining: { type: 'integer' },
        window_ms: { type: 'integer', minimum: 0 },
      },
      additionalProperties: false,
    },
    redaction: {
      type: 'object',
      required: ['applied'],
      properties: {
        applied: { type: 'boolean' },
        rule_ids: { type: 'array', items: { type: 'string' } },
        mutations: { type: 'array', items: { type: 'object', additionalProperties: true } },
      },
      additionalProperties: false,
    },
    approval: {
      type: 'object',
      required: ['required'],
      properties: {
        required: { type: 'boolean' },
        approver_type: { type: 'string', enum: ['human', 'service'] },
        approval_id: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
      },
      additionalProperties: false,
    },
    explain: {
      type: 'object',
      required: ['evaluation_mode', 'rules_checked'],
      properties: {
        evaluation_mode: { type: 'string', enum: ['first_match_wins'] },
        rules_checked: { type: 'integer', minimum: 0 },
        matched_rule_order: { type: 'integer', minimum: 1 },
      },
      additionalProperties: false,
    },
    timestamp: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
};
