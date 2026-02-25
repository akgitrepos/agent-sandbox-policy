import { execFileSync } from 'node:child_process';

function run(command, args) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function main() {
  const output = run('bun', [
    'packages/cli/src/index.ts',
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
    throw new Error('CLI bun compatibility check failed: unexpected command output shape.');
  }

  process.stdout.write('Bun compatibility checks passed.\n');
}

main();
