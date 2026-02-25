import { ReplayError } from '../errors';
import type { CompiledPolicy } from '../parser';
import { InMemoryRateLimitStore } from '../ratelimit';
import { FixedClock } from '../utils';
import { createSchemaValidator } from '../validation';
import { evaluateEventResult } from '../evaluator';

import type { ReplayResult, ReplaySummary, RunTrace } from './types';

const sharedSchemaValidator = createSchemaValidator();

function initializeSummary(): ReplaySummary {
  return {
    totalEvents: 0,
    allowCount: 0,
    denyCount: 0,
    requireApprovalCount: 0,
    allowWithRedactionCount: 0,
    denyRateLimitedCount: 0,
  };
}

function bumpSummary(summary: ReplaySummary, status: string): ReplaySummary {
  const next = {
    ...summary,
    totalEvents: summary.totalEvents + 1,
  };

  if (status === 'allow') {
    next.allowCount += 1;
  } else if (status === 'deny') {
    next.denyCount += 1;
  } else if (status === 'require_approval') {
    next.requireApprovalCount += 1;
  } else if (status === 'allow_with_redaction') {
    next.allowWithRedactionCount += 1;
  } else if (status === 'deny_rate_limited') {
    next.denyRateLimitedCount += 1;
  }

  return next;
}

function toEpochMs(timestamp: string, eventId: string): number {
  const epochMs = Date.parse(timestamp);

  if (!Number.isFinite(epochMs)) {
    throw new ReplayError(`Trace event '${eventId}' has invalid timestamp.`, {
      eventId,
      timestamp,
    });
  }

  return epochMs;
}

export function replayTrace(policy: CompiledPolicy, traceCandidate: unknown): ReplayResult {
  sharedSchemaValidator.assertTrace(traceCandidate);

  const trace = traceCandidate as RunTrace;
  const rateLimitStore = new InMemoryRateLimitStore();

  const events: ReplayResult['events'][number][] = [];
  let summary = initializeSummary();

  for (const [index, event] of trace.events.entries()) {
    const clock = new FixedClock(toEpochMs(event.timestamp, event.event_id));
    const result = evaluateEventResult(policy, event, {
      validateEvent: false,
      rateLimitStore,
      clock,
    });

    events.push({
      index,
      eventId: event.event_id,
      result,
    });

    summary = bumpSummary(summary, result.status);
  }

  return {
    traceId: trace.trace_id,
    runId: trace.run_id,
    events,
    summary,
  };
}
