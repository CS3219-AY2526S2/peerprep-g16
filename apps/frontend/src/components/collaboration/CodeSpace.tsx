import { useState } from "react";

interface CodeSpaceProps {
    isExpanded: boolean;
    onToggle: () => void;
}

const STARTER_CODE = `# Write your solution here
def solve():
    pass

print(solve())
`;

export default function CodeSpace({ isExpanded, onToggle }: CodeSpaceProps) {
    const [code, setCode] = useState(STARTER_CODE);
    const [output, setOutput] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [language, setLanguage] = useState("python");

    const handleRun = async () => {
        setIsRunning(true);
        setOutput(null);
        // Simulate code execution (replace with actual API call)
        await new Promise((r) => setTimeout(r, 800));
        setOutput(`> Running ${language}...\n\nOutput:\n(Connect to a code execution API to run code)\n\n✓ Done in 0.12s`);
        setIsRunning(false);
    };

    const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const newCode = code.substring(0, start) + "    " + code.substring(end);
            setCode(newCode);
            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 4;
            }, 0);
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={onToggle}
                style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "1px dashed #dee2e6",
                    background: "#f8f9fa",
                    color: "#868e96",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                }}
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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", minWidth: 0 }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                background: "#1a1a2e",
                borderRadius: "10px",
                color: "#fff",
            }}>
                <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.02em" }}>{"</>"} Code</span>

                {/* Language selector */}
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{
                        marginLeft: "auto",
                        background: "#2a2a4e",
                        color: "#a9b1d6",
                        border: "1px solid #3a3a6e",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "12px",
                        cursor: "pointer",
                    }}
                >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                </select>

                {/* Run button */}
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    style={{
                        padding: "5px 14px",
                        borderRadius: "6px",
                        border: "none",
                        background: isRunning ? "#2a9d8f88" : "#2a9d8f",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: isRunning ? "not-allowed" : "pointer",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                    }}
                >
                    {isRunning ? (
                        <>
                            <span style={{
                                display: "inline-block",
                                width: "10px", height: "10px",
                                border: "2px solid #ffffff44",
                                borderTop: "2px solid #fff",
                                borderRadius: "50%",
                                animation: "spin 0.6s linear infinite",
                            }} />
                            Running...
                        </>
                    ) : "▶ Run"}
                </button>

                {/* Collapse button */}
                <button
                    onClick={onToggle}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#a9b1d6",
                        cursor: "pointer",
                        fontSize: "16px",
                        padding: "0 4px",
                    }}
                    title="Hide code"
                >
                    ×
                </button>
            </div>

            {/* Editor */}
            <div style={{
                flex: 1,
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid #2a2a4e",
                background: "#0d1117",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
            }}>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleTabKey}
                    spellCheck={false}
                    style={{
                        flex: 1,
                        padding: "16px",
                        background: "transparent",
                        border: "none",
                        color: "#e6edf3",
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                        fontSize: "13px",
                        lineHeight: "1.7",
                        resize: "none",
                        outline: "none",
                        minHeight: "180px",
                    }}
                />

                {/* Output panel */}
                {output !== null && (
                    <div style={{
                        borderTop: "1px solid #21262d",
                        padding: "12px 16px",
                        background: "#161b22",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#2a9d8f",
                        whiteSpace: "pre-wrap",
                        maxHeight: "120px",
                        overflow: "auto",
                    }}>
                        {output}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}