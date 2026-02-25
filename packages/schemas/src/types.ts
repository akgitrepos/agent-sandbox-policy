export type JsonSchema = Record<string, unknown>;

export const SCHEMA_VERSION = '1' as const;

export const SCHEMA_NAMES = ['policy', 'event', 'decision', 'trace', 'testcase'] as const;

export type SchemaName = (typeof SCHEMA_NAMES)[number];

export interface SchemaEntry {
  readonly name: SchemaName;
  readonly file: `${SchemaName}.schema.json`;
  readonly $id: string;
}

export interface SchemaManifest {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly generated_at: string;
  readonly schemas: readonly SchemaEntry[];
}
