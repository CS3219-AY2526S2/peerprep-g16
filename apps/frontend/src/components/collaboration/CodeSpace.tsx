import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Socket } from "socket.io-client";

interface TestCase {
    input: string;
    expectedOutput: string;
}

interface TestCaseResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    error: string;
}

type RunOutput =
    | { type: "raw"; stdout: string; stderr: string }
    | { type: "tests"; results: TestCaseResult[]; stderr: string };

interface CodeSpaceProps {
    isExpanded: boolean;
    onToggle: () => void;
    sessionId: string;
    userId: string;
    socket: Socket | null;
    testCases?: TestCase[];
    questionId?: string;
}

const STARTER_CODE = `# Write your solution here\n`;

// ─── Input parser ─────────────────────────────────────────────────────────────

interface ParsedVar { name: string; value: any; }

/** Split by top-level commas, ignoring commas inside brackets/strings. */
function splitTopLevel(s: string): string[] {
    const segs: string[] = [];
    let depth = 0, start = 0, inStr = false, strChar = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inStr) { if (c === strChar && s[i - 1] !== '\\') inStr = false; }
        else if (c === '"' || c === "'") { inStr = true; strChar = c; }
        else if ('[({'.includes(c)) depth++;
        else if ('])}'.includes(c)) depth--;
        else if (c === ',' && depth === 0) { segs.push(s.slice(start, i).trim()); start = i + 1; }
    }
    segs.push(s.slice(start).trim());
    return segs.filter(Boolean);
}

/** Parse a raw value string (array, number, bool, string) into a JS value. */
function parseValue(raw: string): any {
    const s = raw.trim();
    if (!s) return '';
    try {
        return JSON.parse(
            s.replace(/\bTrue\b/g, 'true')
             .replace(/\bFalse\b/g, 'false')
             .replace(/\bNone\b/g, 'null')
             .replace(/'/g, '"'),
        );
    } catch {
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
            return s.slice(1, -1);
        return s;
    }
}

/**
 * Parse "nums = [-1,0,3], target = 9" → [{name:"nums", value:[-1,0,3]}, {name:"target", value:9}]
 */
function parseInputString(input: string): ParsedVar[] {
    if (!input.trim()) return [];
    return splitTopLevel(input.trim()).flatMap(seg => {
        const eq = seg.indexOf('=');
        if (eq === -1) return [];
        const name = seg.slice(0, eq).trim();
        return /^\w+$/.test(name) ? [{ name, value: parseValue(seg.slice(eq + 1).trim()) }] : [];
    });
}

/** Convert a JS value to a valid Python literal. */
function toPythonLiteral(v: any): string {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number') return String(v);
    if (Array.isArray(v)) return `[${v.map(toPythonLiteral).join(', ')}]`;
    if (typeof v === 'object') {
        const pairs = Object.entries(v).map(([k, val]) => `${JSON.stringify(k)}: ${toPythonLiteral(val)}`);
        return `{${pairs.join(', ')}}`;
    }
    return String(v);
}

/**
 * Build a test harness snippet that injects parsed variables and calls the function.
 * Returns '' for languages we can't auto-harness (Java, C++).
 */
function buildTestHarness(vars: ParsedVar[], fnName: string, language: string): string {
    const args = vars.map(v => v.name).join(', ');
    if (language === 'python') {
        const lines = vars.map(v => `${v.name} = ${toPythonLiteral(v.value)}`);
        return ['\n# --- test harness ---', ...lines, `_result = ${fnName}(${args})`, 'print(_result)'].join('\n');
    }
    if (language === 'javascript' || language === 'typescript') {
        const lines = vars.map(v => `const ${v.name} = ${JSON.stringify(v.value)};`);
        return ['\n// --- test harness ---', ...lines, `const _result = ${fnName}(${args});`, 'console.log(JSON.stringify(_result));'].join('\n');
    }
    return '';
}

/** Try to extract the first function name defined in the user's code. */
function extractFnName(code: string, language: string): string | null {
    if (language === 'python') return code.match(/^def\s+(\w+)\s*\(/m)?.[1] ?? null;
    if (language === 'javascript' || language === 'typescript')
        return code.match(/(?:^function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/m)?.[1] ?? null;
    return null;
}

/**
 * Compare actual vs expected output, normalising whitespace and Python/JS literal differences
 * (e.g. "[0, 1]" matches "[0,1]", "True" matches "true").
 */
function outputsMatch(actual: string, expected: string): boolean {
    const a = actual.trim(), e = expected.trim();
    if (a === e) return true;
    const norm = (s: string) => {
        try {
            return JSON.stringify(JSON.parse(
                s.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null').replace(/'/g, '"'),
            ));
        } catch { return s; }
    };
    return norm(a) === norm(e);
}

// ─── Starter-code generator ───────────────────────────────────────────────────

function generateStarterCode(questionId: string, testCases: TestCase[], language: string): string {
    const vars = parseInputString(testCases[0]?.input ?? '');
    const params = vars.map(v => v.name).join(', ');

    if (language === 'python') {
        const fn = questionId.replace(/-/g, '_');
        return `def ${fn}(${params}):\n    pass\n`;
    }
    if (language === 'javascript') {
        const fn = questionId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return `function ${fn}(${params}) {\n    \n}\n`;
    }
    if (language === 'typescript') {
        const fn = questionId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return `function ${fn}(${params}) {\n    \n}\n`;
    }
    return `// Write your solution here\n`;
}


async function executeCode(
    language: string,
    code: string,
    stdin: string,
): Promise<{ stdout: string; stderr: string }> {
    const res = await fetch("http://localhost:3003/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
    });
    if (!res.ok) throw new Error(`Execution API returned ${res.status}`);
    const data = await res.json();
    return {
        stdout: data.stdout ?? "",
        stderr: data.stderr || data.compileOutput || "",
    };
}

export default function CodeSpace({
    isExpanded, onToggle, sessionId, userId, socket, testCases = [], questionId,
}: CodeSpaceProps) {
    const [code, setCode] = useState(STARTER_CODE);
    const [language, setLanguage] = useState("python");
    const [isRunning, setIsRunning] = useState(false);
    const [peerRunning, setPeerRunning] = useState(false);
    const [runOutput, setRunOutput] = useState<RunOutput | null>(null);
    const [partnerCursor, setPartnerCursor] = useState<{ line: number; col: number } | null>(null);
    const hasServerCode = useRef(false);

    // Auto-generate boilerplate when question loads, but only if no code was saved server-side
    useEffect(() => {
        if (!questionId || testCases.length === 0) return;
        if (hasServerCode.current) return;
        const generated = generateStarterCode(questionId, testCases, language);
        setCode(generated);
        socket?.emit("codeUpdate", { sessionId, userId, code: generated, language });
    }, [questionId, testCases]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!socket) return;

        socket.on("codeState", (payload: { code: string; language: string }) => {
            if (payload.code) {
                setCode(payload.code);
                hasServerCode.current = true;
            }
            if (payload.language) setLanguage(payload.language);
        });

        socket.on("codeUpdate", (payload: { code: string; language: string; userId: string }) => {
            if (payload.userId === userId) return;
            if (payload.code !== undefined) setCode(payload.code);
            if (payload.language) setLanguage(payload.language);
        });

        socket.on("cursor:update", (payload: { userId: string; line: number; col: number }) => {
            if (payload.userId !== userId) setPartnerCursor({ line: payload.line, col: payload.col });
        });

        socket.on("code:run", () => {
            setPeerRunning(true);
            setRunOutput(null);
        });

        socket.on("code:result", ({ output }: { output: RunOutput }) => {
            setPeerRunning(false);
            setRunOutput(output);
        });

        socket.emit("codeState", { sessionId });

        return () => {
            socket.off("codeState");
            socket.off("codeUpdate");
            socket.off("cursor:update");
            socket.off("code:run");
            socket.off("code:result");
        };
    }, [socket, userId, sessionId]);

    const emitCursor = (target: HTMLTextAreaElement, currentCode: string) => {
        const pos = target.selectionStart;
        const lines = currentCode.substring(0, pos).split("\n");
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        socket?.emit("cursor:update", { sessionId, userId, line, col });
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newCode = e.target.value;
        setCode(newCode);
        socket?.emit("codeUpdate", { sessionId, userId, code: newCode, language });
        emitCursor(e.target, newCode);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value;
        setLanguage(newLanguage);
        socket?.emit("codeUpdate", { sessionId, userId, code, language: newLanguage });
    };

    const handleRun = async () => {
        if (!socket || isRunning || peerRunning) return;
        setIsRunning(true);
        setRunOutput(null);

        // Tell peer we're running
        socket.emit("code:run", { sessionId });

        try {
            let output: RunOutput;

            if (testCases.length > 0) {
                // Derive function name: prefer what the user actually defined, fall back to questionId
                const defaultFn = questionId
                    ? language === 'python'
                        ? questionId.replace(/-/g, '_')
                        : questionId.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
                    : 'solution';
                const fnName = extractFnName(code, language) ?? defaultFn;

                const results = await Promise.all(
                    testCases.map(async (tc): Promise<TestCaseResult> => {
                        try {
                            const vars = parseInputString(tc.input);
                            const harness = buildTestHarness(vars, fnName, language);
                            // Inject harness into code; fall back to raw stdin for unsupported languages
                            const codeToRun = harness ? code + harness : code;
                            const stdin = harness ? '' : tc.input;
                            const { stdout, stderr } = await executeCode(language, codeToRun, stdin);
                            const actual = stdout.trimEnd();
                            const expected = tc.expectedOutput.trimEnd();
                            return { input: tc.input, expected, actual, passed: outputsMatch(actual, expected), error: stderr };
                        } catch (err: any) {
                            return { input: tc.input, expected: tc.expectedOutput, actual: "", passed: false, error: err.message };
                        }
                    }),
                );
                // collect any stderr from the first failing/erroring case
                const stderr = results.find(r => r.error)?.error ?? "";
                output = { type: "tests", results, stderr };
            } else {
                const { stdout, stderr } = await executeCode(language, code, "");
                output = { type: "raw", stdout, stderr };
            }

            setRunOutput(output);
            socket.emit("code:result", { sessionId, output });
        } catch (err: any) {
            const output: RunOutput = { type: "raw", stdout: "", stderr: err.message };
            setRunOutput(output);
            socket.emit("code:result", { sessionId, output });
        } finally {
            setIsRunning(false);
        }
    };

    const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const newCode = code.substring(0, start) + "    " + code.substring(end);
            setCode(newCode);
            setTimeout(() => { target.selectionStart = target.selectionEnd = start + 4; }, 0);
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={onToggle}
                style={styles.showBtn}
                onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#6a4c93";
                    (e.target as HTMLElement).style.color = "#6a4c93";
                }}
                onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#dee2e6";
                    (e.target as HTMLElement).style.color = "#868e96";
                }}
            >
                {"</>"} Show Code
            </button>
        );
    }

    const busy = isRunning || peerRunning;
    const runLabel = isRunning ? "Running…" : peerRunning ? "Peer running…" : "▶ Run";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", minWidth: 0, overflow: "hidden" }}>
            {/* Header */}
            <div style={styles.header}>
                <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.02em" }}>{"</>"} Code</span>
                <select value={language} onChange={handleLanguageChange} style={styles.langSelect}>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                </select>
                {partnerCursor && (
                    <span style={styles.cursorBadge} title="Partner's cursor position">
                        Partner: Ln {partnerCursor.line}, Col {partnerCursor.col}
                    </span>
                )}
                <button onClick={handleRun} disabled={busy} style={{ ...styles.runBtn, opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }}>
                    {busy ? (
                        <><span style={styles.spinner} /> {runLabel}</>
                    ) : runLabel}
                </button>
                <button onClick={onToggle} style={styles.closeBtn} title="Hide code">×</button>
            </div>

            {/* Scrollable editor + output */}
            <div style={styles.editorWrap}>
                <textarea
                    value={code}
                    onChange={handleCodeChange}
                    onKeyDown={handleTabKey}
                    onSelect={(e) => emitCursor(e.target as HTMLTextAreaElement, code)}
                    spellCheck={false}
                    style={styles.textarea}
                />

                {/* Output panel — inside the scroll container so it's always reachable */}
                {runOutput && (
                    <div style={styles.outputPanel}>
                        {runOutput.type === "raw" ? (
                            <RawOutput stdout={runOutput.stdout} stderr={runOutput.stderr} />
                        ) : (
                            <TestResults results={runOutput.results} stderr={runOutput.stderr} />
                        )}
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── Output sub-components ────────────────────────────────────────────────────

function RawOutput({ stdout, stderr }: { stdout: string; stderr: string }) {
    if (!stdout && !stderr) return <span style={{ color: "#868e96", fontSize: "12px" }}>No output.</span>;
    return (
        <>
            {stdout && <pre style={styles.pre}>{stdout}</pre>}
            {stderr && <pre style={{ ...styles.pre, color: "#ff6347" }}>{stderr}</pre>}
        </>
    );
}

function TestResults({ results, stderr }: { results: TestCaseResult[]; stderr: string }) {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const allPassed = passed === total;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#a9b1d6", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Test Results
                </span>
                <span style={{
                    fontSize: "11px", fontWeight: 700, padding: "1px 8px", borderRadius: "10px",
                    background: allPassed ? "#2a9d8f22" : "#e6394622",
                    color: allPassed ? "#2a9d8f" : "#e63946",
                    border: `1px solid ${allPassed ? "#2a9d8f44" : "#e6394644"}`,
                }}>
                    {passed}/{total} passed
                </span>
            </div>

            {results.map((r, i) => (
                <div key={i} style={{
                    ...styles.testRow,
                    borderLeft: `3px solid ${r.passed ? "#2a9d8f" : "#e63946"}`,
                    background: r.passed ? "#2a9d8f0a" : "#e639460a",
                }}>
                    <span style={{ color: r.passed ? "#2a9d8f" : "#e63946", fontWeight: 700, fontSize: "12px" }}>
                        {r.passed ? "✓" : "✗"} Test {i + 1}
                    </span>
                    <div style={styles.testDetail}>
                        <span style={styles.testLabel}>Input</span>
                        <code style={styles.testCode}>{r.input || "(none)"}</code>
                    </div>
                    <div style={styles.testDetail}>
                        <span style={styles.testLabel}>Expected</span>
                        <code style={styles.testCode}>{r.expected}</code>
                    </div>
                    {!r.passed && (
                        <div style={styles.testDetail}>
                            <span style={styles.testLabel}>Got</span>
                            <code style={{ ...styles.testCode, color: "#e63946" }}>{r.actual || "(no output)"}</code>
                        </div>
                    )}
                    {r.error && <pre style={{ ...styles.pre, color: "#ff6347", marginTop: "4px", fontSize: "11px" }}>{r.error}</pre>}
                </div>
            ))}

            {stderr && !results.some(r => r.error) && (
                <pre style={{ ...styles.pre, color: "#ff6347" }}>{stderr}</pre>
            )}
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
    showBtn: {
        padding: "10px 20px", borderRadius: "10px", border: "1px dashed #dee2e6",
        background: "#f8f9fa", color: "#868e96", cursor: "pointer",
        fontSize: "13px", fontWeight: 500, transition: "all 0.2s", whiteSpace: "nowrap",
    },
    header: {
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 12px", background: "#1a1a2e", borderRadius: "10px", color: "#fff",
    },
    langSelect: {
        marginLeft: "auto", background: "#2a2a4e", color: "#a9b1d6",
        border: "1px solid #3a3a6e", borderRadius: "6px", padding: "3px 8px",
        fontSize: "12px", cursor: "pointer",
    },
    runBtn: {
        padding: "5px 14px", borderRadius: "6px", border: "none",
        background: "#2a9d8f", color: "#fff", fontSize: "12px", fontWeight: 600,
        transition: "all 0.15s", display: "flex", alignItems: "center", gap: "5px",
    },
    spinner: {
        display: "inline-block", width: "10px", height: "10px",
        border: "2px solid #ffffff44", borderTop: "2px solid #fff",
        borderRadius: "50%", animation: "spin 0.6s linear infinite",
    },
    closeBtn: { background: "none", border: "none", color: "#a9b1d6", cursor: "pointer", fontSize: "16px", padding: "0 4px" },
    cursorBadge: {
        fontSize: "11px", color: "#f4a261", background: "#f4a26118",
        border: "1px solid #f4a26144", borderRadius: "6px", padding: "2px 8px",
        fontFamily: "monospace", whiteSpace: "nowrap" as const,
    },
    editorWrap: {
        flex: 1, borderRadius: "10px", overflow: "hidden",
        border: "1px solid #2a2a4e", background: "#0d1117",
        display: "flex", flexDirection: "column", minHeight: 0,
    },
    textarea: {
        flex: 1, padding: "16px", background: "transparent", border: "none",
        color: "#e6edf3", fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: "13px", lineHeight: "1.7", resize: "none", outline: "none", overflowY: "auto",
    },
    outputPanel: {
        flexShrink: 0, height: "200px", overflowY: "auto",
        borderTop: "1px solid #21262d", padding: "12px 16px",
        background: "#161b22",
    },
    pre: { margin: 0, fontSize: "12px", color: "#2a9d8f", whiteSpace: "pre-wrap", fontFamily: "monospace" },
    testRow: {
        padding: "8px 10px", borderRadius: "6px",
        display: "flex", flexDirection: "column", gap: "4px",
    },
    testDetail: { display: "flex", gap: "8px", alignItems: "baseline" },
    testLabel: { fontSize: "10px", color: "#868e96", minWidth: "52px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
    testCode: { fontSize: "12px", color: "#e6edf3", fontFamily: "monospace", background: "#0d1117", padding: "1px 6px", borderRadius: "4px" },
};
