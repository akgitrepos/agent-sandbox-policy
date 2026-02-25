import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { load } from 'js-yaml';

import { CliError } from '../application/cli-error.js';

function parseJson(raw: string, filePath: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    throw new CliError(`Failed to parse JSON file: ${filePath}`, {
      filePath,
      cause: error,
    });
  }
}

function parseYaml(raw: string, filePath: string): unknown {
  try {
    return load(raw);
  } catch (error: unknown) {
    throw new CliError(`Failed to parse YAML file: ${filePath}`, {
      filePath,
      cause: error,
    });
  }
}

export async function readStructuredFile(filePath: string): Promise<unknown> {
  const absolutePath = path.resolve(filePath);
  const raw = await readFile(absolutePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.json') {
    return parseJson(raw, filePath);
  }

  if (extension === '.yaml' || extension === '.yml') {
    return parseYaml(raw, filePath);
  }

  try {
    return parseJson(raw, filePath);
  } catch {
    return parseYaml(raw, filePath);
  }
}
