import { execFileSync } from 'node:child_process';

function run(command, args) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main() {
  const coreModule = await import('../packages/core/dist/index.js');
  const schemasModule = await import('../packages/schemas/dist/index.js');

  if (!coreModule.parseAndCompilePolicy || !coreModule.evaluateEventResult) {
    throw new Error('Core compatibility check failed: missing expected exports.');
  }

  if (!schemasModule.schemaCatalog || !schemasModule.schemaManifest) {
    throw new Error('Schemas compatibility check failed: missing expected exports.');
  }

  const output = run('node', [
    'packages/cli/dist/index.js',
    'eval',
    '--policy',
    'packages/core/test/fixtures/policy.safe-code-agent.yaml',
    '--event',
    'packages/core/test/fixtures/event.rm-rf-request.json',
    '--format',
    'json',
  ]);

  const parsed = JSON.parse(output);
  if (!parsed.ok || parsed.command !== 'eval') {
    throw new Error('CLI node compatibility check failed: unexpected command output shape.');
  }

  if (!parsed.result || parsed.result.status !== 'deny') {
    throw new Error('CLI node compatibility check failed: expected deny status for fixture event.');
  }

  process.stdout.write('Node compatibility checks passed.\n');
}

main();
