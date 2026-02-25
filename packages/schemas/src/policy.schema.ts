import { SCHEMA_IDS } from './schema-ids';
import type { JsonSchema } from './types';

export const policySchema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: SCHEMA_IDS.policy,
  title: 'ASP Policy',
  type: 'object',
  required: ['version', 'evaluation', 'defaults'],
  properties: {
    version: { type: 'integer', const: 1 },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    evaluation: {
      type: 'object',
      required: ['mode'],
      properties: {
        mode: { type: 'string', enum: ['first_match_wins'] },
      },
      additionalProperties: false,
    },
    defaults: {
      type: 'object',
      required: ['decision'],
      properties: {
        decision: { type: 'string', enum: ['allow', 'deny'] },
        explain: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    rules: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        required: ['id', 'match', 'action'],
        properties: {
          id: { type: 'string', minLength: 1 },
          enabled: { type: 'boolean' },
          match: {
            type: 'object',
            minProperties: 1,
            properties: {
              stage: { type: 'string', enum: ['request', 'output'] },
              tool: { type: 'string', minLength: 1 },
              tool_in: {
                type: 'array',
                minItems: 1,
                items: { type: 'string', minLength: 1 },
              },
              args: { type: 'object', additionalProperties: true },
              context: { type: 'object', additionalProperties: true },
            },
            additionalProperties: false,
          },
          action: {
            type: 'object',
            required: ['decision'],
            properties: {
              decision: {
                type: 'string',
                enum: ['allow', 'deny', 'require_approval'],
              },
              approval: {
                type: 'object',
                required: ['approver_type'],
                properties: {
                  approver_type: {
                    type: 'string',
                    enum: ['human', 'service'],
                  },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
            allOf: [
              {
                if: { properties: { decision: { const: 'require_approval' } } },
                then: { required: ['approval'] },
              },
            ],
          },
          message: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        additionalProperties: false,
      },
    },
    rate_limits: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        required: ['id', 'match', 'limit', 'on_exceed'],
        properties: {
          id: { type: 'string', minLength: 1 },
          enabled: { type: 'boolean' },
          match: {
            type: 'object',
            minProperties: 1,
            properties: {
              stage: { type: 'string', enum: ['request', 'output'] },
              tool: { type: 'string', minLength: 1 },
              tool_in: {
                type: 'array',
                minItems: 1,
                items: { type: 'string', minLength: 1 },
              },
            },
            additionalProperties: false,
          },
          limit: {
            type: 'object',
            required: ['scope', 'requests', 'per'],
            properties: {
              scope: {
                type: 'string',
                enum: ['per_run', 'global', 'per_agent', 'per_tool'],
              },
              requests: { type: 'integer', minimum: 1 },
              per: { type: 'string', pattern: '^\\d+(ms|s|m|h|d)$' },
            },
            additionalProperties: false,
          },
          on_exceed: {
            type: 'object',
            required: ['decision'],
            properties: {
              decision: { type: 'string', enum: ['deny', 'require_approval'] },
              message: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
    redaction: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        required: ['id', 'match', 'apply'],
        properties: {
          id: { type: 'string', minLength: 1 },
          enabled: { type: 'boolean' },
          match: {
            type: 'object',
            properties: {
              stage: { const: 'output' },
              tool: { type: 'string', minLength: 1 },
              tool_in: {
                type: 'array',
                minItems: 1,
                items: { type: 'string', minLength: 1 },
              },
            },
            additionalProperties: false,
          },
          apply: {
            oneOf: [
              {
                type: 'object',
                required: ['mode', 'patterns'],
                properties: {
                  mode: { const: 'text_regex' },
                  patterns: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['regex', 'replace'],
                      properties: {
                        regex: { type: 'string', minLength: 1 },
                        replace: { type: 'string' },
                      },
                      additionalProperties: false,
                    },
                  },
                },
                additionalProperties: false,
              },
              {
                type: 'object',
                required: ['mode', 'field_names'],
                properties: {
                  mode: { const: 'json_field_mask' },
                  field_names: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string', minLength: 1 },
                  },
                  replacement: { type: 'string' },
                },
                additionalProperties: false,
              },
            ],
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};
