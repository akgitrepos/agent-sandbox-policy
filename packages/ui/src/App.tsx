import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createSchemaValidator,
  evaluateEventResult,
  parseAndCompilePolicy,
  replayTrace,
  runPolicyTests,
} from '@asp/core';

type TabId = 'playground' | 'trace' | 'tests' | 'redaction';

interface PlaygroundMeta {
  readonly status: string;
  readonly matchedRule: string;
  readonly reasons: string;
}

interface TraceMeta {
  readonly events: string;
  readonly denied: string;
  readonly limited: string;
}

interface TestsMeta {
  readonly passed: string;
  readonly failed: string;
}

interface RedactionMeta {
  readonly status: string;
  readonly mutations: string;
}

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
          regex_any: ['rm\\s+-rf']
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
        - regex: '(?i)(api[_-]?key\\s*[:=]\\s*)[A-Za-z0-9_\\-]{8,}'
          replace: '$1[REDACTED]'
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

const STORAGE_KEYS = {
  policy: 'asp.ui.policy',
  event: 'asp.ui.event',
  trace: 'asp.ui.trace',
  tests: 'asp.ui.tests',
  outputEvent: 'asp.ui.outputEvent',
} as const;

function parseJsonText(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function readPersistedText(key: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);
  return stored ?? fallback;
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function EditorTools(props: {
  readonly filename: string;
  readonly value: string;
  readonly onImport: (next: string) => void;
  readonly onReset: () => void;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function importFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }

    const text = await file.text();
    props.onImport(text);
  }

  return (
    <div className="tool-row">
      <button className="ghost" onClick={() => inputRef.current?.click()}>Import</button>
      <button className="ghost" onClick={() => downloadText(props.filename, props.value)}>Export</button>
      <button className="ghost" onClick={props.onReset}>Reset</button>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept=".json,.yaml,.yml"
        onChange={async (event) => {
          await importFile(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}

function ResultTools(props: {
  readonly filename: string;
  readonly value: string;
  readonly onCopy: () => void;
}): JSX.Element {
  return (
    <div className="tool-row tool-row-result">
      <button className="ghost" onClick={props.onCopy}>Copy Result</button>
      <button className="ghost" onClick={() => downloadText(props.filename, props.value)}>Export Result</button>
    </div>
  );
}

function MetaChips(props: { readonly items: readonly { label: string; value: string }[] }): JSX.Element {
  return (
    <div className="chip-row" aria-label="Result summary chips">
      {props.items.map((item) => (
        <span key={item.label} className="chip">
          <em>{item.label}</em>
          <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}

function App() {
  const validator = useMemo(() => createSchemaValidator(), []);

  const [activeTab, setActiveTab] = useState<TabId>('playground');
  const [policyText, setPolicyText] = useState(() => readPersistedText(STORAGE_KEYS.policy, defaultPolicy));
  const [eventText, setEventText] = useState(() => readPersistedText(STORAGE_KEYS.event, defaultEvent));
  const [traceText, setTraceText] = useState(() => readPersistedText(STORAGE_KEYS.trace, defaultTrace));
  const [testsText, setTestsText] = useState(() => readPersistedText(STORAGE_KEYS.tests, defaultTests));
  const [outputEventText, setOutputEventText] = useState(() =>
    readPersistedText(STORAGE_KEYS.outputEvent, defaultOutputEvent)
  );

  const [playgroundResult, setPlaygroundResult] = useState<string>('Run evaluation to inspect a decision.');
  const [traceResult, setTraceResult] = useState<string>('Run replay to inspect timeline and summary.');
  const [testsResult, setTestsResult] = useState<string>('Run tests to view pass/fail report.');
  const [redactionResult, setRedactionResult] = useState<string>('Preview redaction to inspect applied mutations.');
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [playgroundMeta, setPlaygroundMeta] = useState<PlaygroundMeta>({
    status: 'pending',
    matchedRule: '-',
    reasons: '0',
  });
  const [traceMeta, setTraceMeta] = useState<TraceMeta>({
    events: '0',
    denied: '0',
    limited: '0',
  });
  const [testsMeta, setTestsMeta] = useState<TestsMeta>({
    passed: '0',
    failed: '0',
  });
  const [redactionMeta, setRedactionMeta] = useState<RedactionMeta>({
    status: 'pending',
    mutations: '0',
  });

  function resetAllDrafts(): void {
    setPolicyText(defaultPolicy);
    setEventText(defaultEvent);
    setTraceText(defaultTrace);
    setTestsText(defaultTests);
    setOutputEventText(defaultOutputEvent);
    setPlaygroundResult('Run evaluation to inspect a decision.');
    setTraceResult('Run replay to inspect timeline and summary.');
    setTestsResult('Run tests to view pass/fail report.');
    setRedactionResult('Preview redaction to inspect applied mutations.');
    setStatusMessage('Drafts reset to defaults.');

    window.localStorage.removeItem(STORAGE_KEYS.policy);
    window.localStorage.removeItem(STORAGE_KEYS.event);
    window.localStorage.removeItem(STORAGE_KEYS.trace);
    window.localStorage.removeItem(STORAGE_KEYS.tests);
    window.localStorage.removeItem(STORAGE_KEYS.outputEvent);
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.policy, policyText);
  }, [policyText]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.event, eventText);
  }, [eventText]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.trace, traceText);
  }, [traceText]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.tests, testsText);
  }, [testsText]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.outputEvent, outputEventText);
  }, [outputEventText]);

  useEffect(() => {
    const recovered: string[] = [];

    try {
      parseAndCompilePolicy(policyText);
    } catch {
      setPolicyText(defaultPolicy);
      window.localStorage.setItem(STORAGE_KEYS.policy, defaultPolicy);
      recovered.push('policy');
    }

    try {
      const parsed = parseJsonText(eventText);
      validator.assertEvent(parsed);
    } catch {
      setEventText(defaultEvent);
      window.localStorage.setItem(STORAGE_KEYS.event, defaultEvent);
      recovered.push('event');
    }

    try {
      const parsed = parseJsonText(traceText);
      validator.assertTrace(parsed);
    } catch {
      setTraceText(defaultTrace);
      window.localStorage.setItem(STORAGE_KEYS.trace, defaultTrace);
      recovered.push('trace');
    }

    try {
      const parsed = parseJsonText(testsText);
      validator.assertTestcase(parsed);
    } catch {
      setTestsText(defaultTests);
      window.localStorage.setItem(STORAGE_KEYS.tests, defaultTests);
      recovered.push('tests');
    }

    try {
      const parsed = parseJsonText(outputEventText);
      validator.assertEvent(parsed);
    } catch {
      setOutputEventText(defaultOutputEvent);
      window.localStorage.setItem(STORAGE_KEYS.outputEvent, defaultOutputEvent);
      recovered.push('output event');
    }

    if (recovered.length > 0) {
      setStatusMessage(`Recovered invalid saved drafts: ${recovered.join(', ')}.`);
    }
  }, []);

  async function handleCopyResult(value: string): Promise<void> {
    try {
      await copyText(value);
      setStatusMessage('Result copied to clipboard.');
    } catch (error: unknown) {
      setStatusMessage(`Copy failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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
      setPlaygroundResult(stringify(result));
      setStatusMessage(`Decision computed: ${result.status}`);
      setPlaygroundMeta({
        status: result.status,
        matchedRule: result.decision.matchedRuleId ?? 'default',
        reasons: String(result.decision.reasons.length),
      });
    } catch (error: unknown) {
      setPlaygroundResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage(`Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function handleReplayTrace(): void {
    try {
      const policy = parseAndCompilePolicy(policyText);
      const trace = parseJsonText(traceText);
      validator.assertTrace(trace);
      const result = replayTrace(policy, trace);
      setTraceResult(stringify(result));
      setStatusMessage(`Replay complete: ${result.summary.totalEvents} events.`);
      setTraceMeta({
        events: String(result.summary.totalEvents),
        denied: String(result.summary.denyCount),
        limited: String(result.summary.denyRateLimitedCount),
      });
    } catch (error: unknown) {
      setTraceResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage(`Replay failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function handleRunTests(): void {
    try {
      const policy = parseAndCompilePolicy(policyText);
      const suite = parseJsonText(testsText);
      validator.assertTestcase(suite);
      const report = runPolicyTests(policy, suite);
      setTestsResult(stringify(report));
      setStatusMessage(`Tests complete: ${report.passed}/${report.total} passed.`);
      setTestsMeta({
        passed: String(report.passed),
        failed: String(report.failed),
      });
    } catch (error: unknown) {
      setTestsResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage(`Test run failed: ${error instanceof Error ? error.message : String(error)}`);
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
      setRedactionResult(stringify(payload));
      setStatusMessage(`Redaction preview complete: ${result.redaction.mutations.length} mutations.`);
      setRedactionMeta({
        status: result.status,
        mutations: String(result.redaction.mutations.length),
      });
    } catch (error: unknown) {
      setRedactionResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage(`Redaction preview failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Agent Sandbox Policy</p>
        <h1>Policy Lab</h1>
        <p className="subtitle">Author, evaluate, replay, test, and inspect policy behavior in one deterministic workspace.</p>
      </header>

      <div className="top-controls">
        <nav className="tab-row" aria-label="Policy lab sections">
          <button aria-label="Open playground tab" className={activeTab === 'playground' ? 'tab active' : 'tab'} onClick={() => setActiveTab('playground')}>Playground</button>
          <button aria-label="Open trace replay tab" className={activeTab === 'trace' ? 'tab active' : 'tab'} onClick={() => setActiveTab('trace')}>Trace Replay</button>
          <button aria-label="Open policy tests tab" className={activeTab === 'tests' ? 'tab active' : 'tab'} onClick={() => setActiveTab('tests')}>Policy Tests</button>
          <button aria-label="Open redaction preview tab" className={activeTab === 'redaction' ? 'tab active' : 'tab'} onClick={() => setActiveTab('redaction')}>Redaction Preview</button>
        </nav>
        <div className="top-actions">
          <div className="status-pill">{statusMessage}</div>
          <button className="ghost" onClick={resetAllDrafts}>Reset All Drafts</button>
        </div>
      </div>

      <main className="workspace">
        <section className="panel policy-panel">
          <div className="panel-header">
            <h2>Policy</h2>
            <button aria-label="Validate policy" className="action" onClick={handleValidatePolicy}>Validate Policy</button>
          </div>
          <textarea
            className="editor"
            value={policyText}
            onChange={(event) => setPolicyText(event.target.value)}
            spellCheck={false}
            aria-label="Policy editor"
          />
          <EditorTools
            filename="policy.yaml"
            value={policyText}
            onImport={setPolicyText}
            onReset={() => setPolicyText(defaultPolicy)}
          />
        </section>

        {activeTab === 'playground' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Event Simulator</h2>
              <button aria-label="Evaluate event" className="action" onClick={handleEvaluateEvent}>Evaluate Event</button>
            </div>
            <MetaChips
              items={[
                { label: 'status', value: playgroundMeta.status },
                { label: 'matched rule', value: playgroundMeta.matchedRule },
                { label: 'reasons', value: playgroundMeta.reasons },
              ]}
            />
            <textarea
              className="editor"
              value={eventText}
              onChange={(event) => setEventText(event.target.value)}
              spellCheck={false}
              aria-label="Event editor"
            />
            <EditorTools
              filename="event.json"
              value={eventText}
              onImport={setEventText}
              onReset={() => setEventText(defaultEvent)}
            />
            <ResultTools
              filename="decision-result.json"
              value={playgroundResult}
              onCopy={() => {
                void handleCopyResult(playgroundResult);
              }}
            />
            <pre className="result">{playgroundResult}</pre>
          </section>
        )}

        {activeTab === 'trace' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Trace Replay</h2>
              <button aria-label="Replay trace" className="action" onClick={handleReplayTrace}>Replay Trace</button>
            </div>
            <MetaChips
              items={[
                { label: 'events', value: traceMeta.events },
                { label: 'denied', value: traceMeta.denied },
                { label: 'rate-limited', value: traceMeta.limited },
              ]}
            />
            <textarea
              className="editor"
              value={traceText}
              onChange={(event) => setTraceText(event.target.value)}
              spellCheck={false}
              aria-label="Trace editor"
            />
            <EditorTools
              filename="trace.json"
              value={traceText}
              onImport={setTraceText}
              onReset={() => setTraceText(defaultTrace)}
            />
            <ResultTools
              filename="replay-result.json"
              value={traceResult}
              onCopy={() => {
                void handleCopyResult(traceResult);
              }}
            />
            <pre className="result">{traceResult}</pre>
          </section>
        )}

        {activeTab === 'tests' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Policy Tests</h2>
              <button aria-label="Run policy tests" className="action" onClick={handleRunTests}>Run Tests</button>
            </div>
            <MetaChips
              items={[
                { label: 'passed', value: testsMeta.passed },
                { label: 'failed', value: testsMeta.failed },
              ]}
            />
            <textarea
              className="editor"
              value={testsText}
              onChange={(event) => setTestsText(event.target.value)}
              spellCheck={false}
              aria-label="Tests editor"
            />
            <EditorTools
              filename="tests.json"
              value={testsText}
              onImport={setTestsText}
              onReset={() => setTestsText(defaultTests)}
            />
            <ResultTools
              filename="test-report.json"
              value={testsResult}
              onCopy={() => {
                void handleCopyResult(testsResult);
              }}
            />
            <pre className="result">{testsResult}</pre>
          </section>
        )}

        {activeTab === 'redaction' && (
          <section className="panel main-panel">
            <div className="panel-header">
              <h2>Redaction Preview</h2>
              <button aria-label="Preview redaction" className="action" onClick={handlePreviewRedaction}>Preview Redaction</button>
            </div>
            <MetaChips
              items={[
                { label: 'status', value: redactionMeta.status },
                { label: 'mutations', value: redactionMeta.mutations },
              ]}
            />
            <textarea
              className="editor"
              value={outputEventText}
              onChange={(event) => setOutputEventText(event.target.value)}
              spellCheck={false}
              aria-label="Output event editor"
            />
            <EditorTools
              filename="output-event.json"
              value={outputEventText}
              onImport={setOutputEventText}
              onReset={() => setOutputEventText(defaultOutputEvent)}
            />
            <ResultTools
              filename="redaction-result.json"
              value={redactionResult}
              onCopy={() => {
                void handleCopyResult(redactionResult);
              }}
            />
            <pre className="result">{redactionResult}</pre>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
