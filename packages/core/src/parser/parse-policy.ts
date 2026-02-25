import { load } from 'js-yaml';

import { ParseError } from '../errors';
import { createSchemaValidator } from '../validation';

import { compilePolicy } from './compiler';
import type { CompiledPolicy, PolicyDocument, PolicyFormat } from './types';

function detectFormat(raw: string): PolicyFormat {
  const first = raw.trimStart()[0];
  if (first === '{' || first === '[') {
    return 'json';
  }

  return 'yaml';
}

function parseText(input: string, format?: PolicyFormat): unknown {
  const selectedFormat = format ?? detectFormat(input);

  try {
    if (selectedFormat === 'json') {
      return JSON.parse(input) as unknown;
    }

    return load(input);
  } catch (error: unknown) {
    throw new ParseError(`Failed to parse policy as ${selectedFormat}.`, {
      format: selectedFormat,
      cause: error,
    });
  }
}

function ensurePolicyObject(candidate: unknown): Record<string, unknown> {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new ParseError('Policy root must be an object.');
  }

  return candidate as Record<string, unknown>;
}

export function parsePolicy(input: string | Record<string, unknown>, format?: PolicyFormat): PolicyDocument {
  const parsed = typeof input === 'string' ? parseText(input, format) : input;
  const policyObject = ensurePolicyObject(parsed);

  const validator = createSchemaValidator();
  validator.assertPolicy(policyObject);

  return policyObject as unknown as PolicyDocument;
}

export function parseAndCompilePolicy(
  input: string | Record<string, unknown>,
  format?: PolicyFormat
): CompiledPolicy {
  const parsedPolicy = parsePolicy(input, format);
  return compilePolicy(parsedPolicy);
}
