import { readFileSync, writeFileSync } from 'node:fs';

const target = process.argv[2];

if (!target) {
  throw new Error('Usage: node scripts/add-shebang.mjs <file-path>');
}

const source = readFileSync(target, 'utf8');

if (source.startsWith('#!/usr/bin/env node')) {
  process.exit(0);
}

writeFileSync(target, `#!/usr/bin/env node\n${source}`, 'utf8');
