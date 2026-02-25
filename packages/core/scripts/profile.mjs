import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { evaluateEventResult, parseAndCompilePolicy } from '../dist/index.js';

const policyPath = new URL('../test/fixtures/policy.safe-code-agent.yaml', import.meta.url);
const eventPath = new URL('../test/fixtures/event.rm-rf-request.json', import.meta.url);

const policyText = readFileSync(policyPath, 'utf8');
const event = JSON.parse(readFileSync(eventPath, 'utf8'));
const policy = parseAndCompilePolicy(policyText);

const iterations = 10_000;
const started = performance.now();

for (let index = 0; index < iterations; index += 1) {
  evaluateEventResult(policy, event, { validateEvent: false });
}

const elapsedMs = performance.now() - started;
const throughput = Math.round((iterations / elapsedMs) * 1000);

process.stdout.write(`Profile: ${iterations} evaluations in ${elapsedMs.toFixed(2)} ms\n`);
process.stdout.write(`Throughput: ${throughput} events/sec\n`);
