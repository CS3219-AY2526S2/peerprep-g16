import { useState } from "react";

interface Hint {
    level: string;
    text: string;
    color: string;
}

interface HintPanelProps {
    hints?: Hint[];
}

const DEFAULT_HINTS: Hint[] = [
    {
        level: "Nudge",
        text: "Think about what data structure would give you O(1) lookups. What have you seen before that solves similar problems?",
        color: "#2a9d8f",
    },
    {
        level: "Approach",
        text: "Consider using a hash map to store values you've already seen. As you iterate, check if the complement (target - current) exists in your map.",
        color: "#e9c46a",
    },
    {
        level: "Solution outline",
        text: "Initialize an empty dict. For each index i and value num: check if (target - num) is in the dict — if yes, return [dict[target-num], i]. Otherwise, store dict[num] = i.",
        color: "#f4a261",
    },
];

export default function HintPanel({ hints = DEFAULT_HINTS }: HintPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [revealedHints, setRevealedHints] = useState<number[]>([]);

    const revealNext = () => {
        const next = revealedHints.length;
        if (next < hints.length) {
            setRevealedHints([...revealedHints, next]);
        }
    };

    const reset = () => setRevealedHints([]);

    return (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e9ecef" }}>
            {/* Toggle header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: isOpen ? "#fef9ee" : "#fff",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.2s",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>💡</span>
                    <span style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#1a1a2e",
                        letterSpacing: "0.01em",
                    }}>
                        Need a hint?
                    </span>
                    {revealedHints.length > 0 && (
                        <span style={{
                            background: "#e9c46a22",
                            color: "#b07d00",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "20px",
                            border: "1px solid #e9c46a55",
                        }}>
                            {revealedHints.length}/{hints.length} shown
                        </span>
                    )}
                </div>
                <span style={{
                    fontSize: "18px",
                    color: "#868e96",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                }}>
                    ‹
                </span>
            </button>

            {/* Hints body */}
            {isOpen && (
                <div style={{
                    background: "#fef9ee",
                    padding: "0 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}>
                    {/* Revealed hints */}
                    {revealedHints.map((idx) => {
                        const hint = hints[idx];
                        return (
                            <div
                                key={idx}
                                style={{
                                    padding: "12px 14px",
                                    borderRadius: "8px",
                                    background: "#fff",
                                    borderLeft: `3px solid ${hint.color}`,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                }}
                            >
                                <div style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: hint.color,
                                    marginBottom: "5px",
                                }}>
                                    Hint {idx + 1} · {hint.level}
                                </div>
                                <p style={{
                                    margin: 0,
                                    fontSize: "13px",
                                    color: "#495057",
                                    lineHeight: "1.6",
                                }}>
                                    {hint.text}
                                </p>
                            </div>
                        );
                    })}

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        {revealedHints.length < hints.length && (
                            <button
                                onClick={revealNext}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "7px",
                                    border: "1px solid #e9c46a",
                                    background: "#e9c46a",
                                    color: "#7a5800",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                {revealedHints.length === 0 ? "Show first hint" : "Next hint →"}
                            </button>
                        )}
                        {revealedHints.length === hints.length && (
                            <span style={{ fontSize: "12px", color: "#2a9d8f", fontWeight: 500, alignSelf: "center" }}>
                                ✓ All hints revealed
                            </span>
                        )}
                        {revealedHints.length > 0 && (
                            <button
                                onClick={reset}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: "7px",
                                    border: "1px solid #dee2e6",
                                    background: "#fff",
                                    color: "#868e96",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                }}
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}