import { useMemo, useState } from 'react';

import {
  createSchemaValidator,
  evaluateEventResult,
  parseAndCompilePolicy,
  replayTrace,
  runPolicyTests,
} from '@asp/core';

type TabId = 'playground' | 'trace' | 'tests' | 'redaction';

const defaultPolicy = `version: 1
name: "safe-code-agent"
evaluation:
  mode: first_match_wins
defaults:
  decision: deny
  explain: true
rules:
  - id: allow-read
    match:
      stage: request
      tool_in: ["fs.read", "git.status", "git.diff"]
    action:
      decision: allow
    severity: low
  - id: deny-rm-rf
    match:
      stage: request
      tool: shell.exec
      args:
        command:
          regex_any: ["rm\\s+-rf"]
    action:
      decision: deny
    message: "Destructive shell commands are blocked."
    severity: high
rate_limits:
  - id: web-budget
    match:
      stage: request
      tool: web.search
    limit:
      scope: per_run
      requests: 1
      per: "1m"
    on_exceed:
      decision: deny
      message: "web.search budget exceeded"
redaction:
  - id: mask-api-key
    match:
      stage: output
      tool: shell.exec
    apply:
      mode: text_regex
      patterns:
        - regex: "(?i)(api[_-]?key\\s*[:=]\\s*)[A-Za-z0-9_\\-]{8,}"
          replace: "$1[REDACTED]"
`;

const defaultEvent = `{
  "schema_version": "1",
  "event_id": "evt_1",
  "run_id": "run_1",
  "stage": "request",
  "tool_name": "shell.exec",
  "arguments": {
    "command": "rm -rf /tmp/cache"
  },
  "timestamp": "2026-02-22T00:00:00Z"
}`;

const defaultTrace = `{
  "schema_version": "1",
  "trace_id": "trace_1",
  "run_id": "run_1",
  "events": [
    {
      "schema_version": "1",
      "event_id": "evt_web_1",
      "run_id": "run_1",
      "stage": "request",
      "tool_name": "web.search",
      "arguments": { "q": "first" },
      "timestamp": "2026-02-22T00:00:00Z"
    },
    {
      "schema_version": "1",
      "event_id": "evt_web_2",
      "run_id": "run_1",
      "stage": "request",
      "tool_name": "web.search",
      "arguments": { "q": "second" },
      "timestamp": "2026-02-22T00:00:10Z"
    }
  ]
}`;

const defaultTests = `{
  "schema_version": "1",
  "tests": [
    {
      "id": "allow_read",
      "event": {
        "schema_version": "1",
        "event_id": "evt_allow",
        "run_id": "run_1",
        "stage": "request",
        "tool_name": "fs.read",
        "arguments": { "path": "/repo/README.md" },
        "timestamp": "2026-02-22T00:00:00Z"
      },
      "expected": {
        "status": "allow",
        "matched_rule_id": "allow-read"
      }
    }
  ]
}`;

const defaultOutputEvent = `{
  "schema_version": "1",
  "event_id": "evt_out",
  "run_id": "run_1",
  "stage": "output",
  "tool_name": "shell.exec",
  "output": {
    "stdout": "Build complete\\nAPI_KEY=abcd1234SECRETXYZ"
  },
  "timestamp": "2026-02-22T00:00:20Z"
}`;

function parseJsonText(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function App() {
  const validator = useMemo(() => createSchemaValidator(), []);

  const [activeTab, setActiveTab] = useState<TabId>('playground');
  const [policyText, setPolicyText] = useState(defaultPolicy);
  const [eventText, setEventText] = useState(defaultEvent);
  const [traceText, setTraceText] = useState(defaultTrace);
  const [testsText, setTestsText] = useState(defaultTests);
  const [outputEventText, setOutputEventText] = useState(defaultOutputEvent);

  const [playgroundResult, setPlaygroundResult] = useState<string>('Run evaluation to inspect a decision.');
  const [traceResult, setTraceResult] = useState<string>('Run replay to inspect timeline and summary.');
  const [testsResult, setTestsResult] = useState<string>('Run tests to view pass/fail report.');
  const [redactionResult, setRedactionResult] = useState<string>('Preview redaction to inspect applied mutations.');
  const [statusMessage, setStatusMessage] = useState<string>('Ready');

  function handleValidatePolicy(): void {
    try {
      parseAndCompilePolicy(policyText);
      setStatusMessage('Policy is valid and compiled successfully.');
    } catch (error: unknown) {
      setStatusMessage(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function handleEvaluateEvent(): void {
    try {
      const policy = parseAndCompilePolicy(policyText);
      const event = parseJsonText(eventText);
      validator.assertEvent(event);
      const result = evaluateEventResult(policy, event);
      setPlaygroundResult(JSON.stringify(result, null, 2));
      setStatusMessage(`Decision computed: ${result.status}`);
    } catch (error: unknown) {
      setPlaygroundResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage('Evaluation failed.');
    }
  }

  function handleReplayTrace(): void {
    try {
      const policy = parseAndCompilePolicy(policyText);
      const trace = parseJsonText(traceText);
      validator.assertTrace(trace);
      const result = replayTrace(policy, trace);
      setTraceResult(JSON.stringify(result, null, 2));
      setStatusMessage(`Replay complete: ${result.summary.totalEvents} events.`);
    } catch (error: unknown) {
      setTraceResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage('Replay failed.');
    }
  }

  function handleRunTests(): void {
    try {
      const policy = parseAndCompilePolicy(policyText);
      const suite = parseJsonText(testsText);
      validator.assertTestcase(suite);
      const report = runPolicyTests(policy, suite);
      setTestsResult(JSON.stringify(report, null, 2));
      setStatusMessage(`Tests complete: ${report.passed}/${report.total} passed.`);
    } catch (error: unknown) {
      setTestsResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage('Test run failed.');
    }
  }

  function handlePreviewRedaction(): void {
    try {
      const policy = parseAndCompilePolicy(policyText);
      const event = parseJsonText(outputEventText);
      validator.assertEvent(event);
      const result = evaluateEventResult(policy, event);
      const payload = {
        status: result.status,
        redaction: result.redaction,
        redactedOutput: result.redactedOutput,
      };
      setRedactionResult(JSON.stringify(payload, null, 2));
      setStatusMessage(`Redaction preview complete: ${result.redaction.mutations.length} mutations.`);
    } catch (error: unknown) {
      setRedactionResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage('Redaction preview failed.');
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Agent Sandbox Policy</p>
        <h1>Policy Lab</h1>
        <p className="subtitle">Author, evaluate, replay, test, and inspect policy behavior in one deterministic workspace.</p>
        <div className="status-pill">{statusMessage}</div>
      </header>

      <nav className="tab-row" aria-label="Policy lab sections">
        <button className={activeTab === 'playground' ? 'tab active' : 'tab'} onClick={() => setActiveTab('playground')}>Playground</button>
        <button className={activeTab === 'trace' ? 'tab active' : 'tab'} onClick={() => setActiveTab('trace')}>Trace Replay</button>
        <button className={activeTab === 'tests' ? 'tab active' : 'tab'} onClick={() => setActiveTab('tests')}>Policy Tests</button>
        <button className={activeTab === 'redaction' ? 'tab active' : 'tab'} onClick={() => setActiveTab('redaction')}>Redaction Preview</button>
      </nav>

      <main className="workspace">
        <section className="panel policy-panel">
          <div className="panel-header">
            <h2>Policy</h2>
            <button className="action" onClick={handleValidatePolicy}>Validate Policy</button>
          </div>
          <textarea
            className="editor"
            value={policyText}
            onChange={(event) => setPolicyText(event.target.value)}
            spellCheck={false}
          />
        </section>

        {activeTab === 'playground' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Event Simulator</h2>
              <button className="action" onClick={handleEvaluateEvent}>Evaluate Event</button>
            </div>
            <textarea
              className="editor"
              value={eventText}
              onChange={(event) => setEventText(event.target.value)}
              spellCheck={false}
            />
            <pre className="result">{playgroundResult}</pre>
          </section>
        )}

        {activeTab === 'trace' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Trace Replay</h2>
              <button className="action" onClick={handleReplayTrace}>Replay Trace</button>
            </div>
            <textarea
              className="editor"
              value={traceText}
              onChange={(event) => setTraceText(event.target.value)}
              spellCheck={false}
            />
            <pre className="result">{traceResult}</pre>
          </section>
        )}

        {activeTab === 'tests' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Policy Tests</h2>
              <button className="action" onClick={handleRunTests}>Run Tests</button>
            </div>
            <textarea
              className="editor"
              value={testsText}
              onChange={(event) => setTestsText(event.target.value)}
              spellCheck={false}
            />
            <pre className="result">{testsResult}</pre>
          </section>
        )}

        {activeTab === 'redaction' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Redaction Preview</h2>
              <button className="action" onClick={handlePreviewRedaction}>Preview Redaction</button>
            </div>
            <textarea
              className="editor"
              value={outputEventText}
              onChange={(event) => setOutputEventText(event.target.value)}
              spellCheck={false}
            />
            <pre className="result">{redactionResult}</pre>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
