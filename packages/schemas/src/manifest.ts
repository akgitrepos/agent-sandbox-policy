import { SCHEMA_IDS } from './schema-ids';
import type { SchemaManifest } from './types';

export const schemaManifest: SchemaManifest = {
  schema_version: '1',
  generated_at: '2026-02-24T00:00:00Z',
  schemas: [
    {
      name: 'policy',
      file: 'policy.schema.json',
      $id: SCHEMA_IDS.policy,
    },
    {
      name: 'event',
      file: 'event.schema.json',
      $id: SCHEMA_IDS.event,
    },
    {
      name: 'decision',
      file: 'decision.schema.json',
      $id: SCHEMA_IDS.decision,
    },
    {
      name: 'trace',
      file: 'trace.schema.json',
      $id: SCHEMA_IDS.trace,
    },
    {
      name: 'testcase',
      file: 'testcase.schema.json',
      $id: SCHEMA_IDS.testcase,
    },
  ],
};
