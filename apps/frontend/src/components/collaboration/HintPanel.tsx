import { useState } from "react";

interface HintPanelProps {
    hints?: string[];
}

export default function HintPanel({ hints = [] }: HintPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [revealedCount, setRevealedCount] = useState(0);

    const revealNext = () => {
        if (revealedCount < hints.length) {
            setRevealedCount(revealedCount + 1);
        }
    };

    const reset = () => setRevealedCount(0);

    return (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e9ecef" }}>
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
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a2e" }}>
                        Need a hint?
                    </span>
                    {revealedCount > 0 && (
                        <span style={{
                            background: "#e9c46a22", color: "#b07d00", fontSize: "11px",
                            fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
                            border: "1px solid #e9c46a55",
                        }}>
                            {revealedCount}/{hints.length} shown
                        </span>
                    )}
                </div>
                <span style={{
                    fontSize: "18px", color: "#868e96",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s", display: "inline-block",
                }}>
                    ‹
                </span>
            </button>

            {isOpen && (
                <div style={{
                    background: "#fef9ee", padding: "0 16px 16px",
                    display: "flex", flexDirection: "column", gap: "10px",
                }}>
                    {hints.slice(0, revealedCount).map((hint, idx) => (
                        <div key={idx} style={{
                            padding: "12px 14px", borderRadius: "8px", background: "#fff",
                            borderLeft: "3px solid #e9c46a", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }}>
                            <div style={{
                                fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                                letterSpacing: "0.08em", color: "#e9c46a", marginBottom: "5px",
                            }}>
                                Hint {idx + 1}
                            </div>
                            <p style={{ margin: 0, fontSize: "13px", color: "#495057", lineHeight: "1.6" }}>
                                {hint}
                            </p>
                        </div>
                    ))}

                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        {revealedCount < hints.length && (
                            <button onClick={revealNext} style={{
                                padding: "8px 16px", borderRadius: "7px",
                                border: "1px solid #e9c46a", background: "#e9c46a",
                                color: "#7a5800", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                            }}>
                                {revealedCount === 0 ? "Show first hint" : "Next hint →"}
                            </button>
                        )}
                        {revealedCount === hints.length && hints.length > 0 && (
                            <span style={{ fontSize: "12px", color: "#2a9d8f", fontWeight: 500, alignSelf: "center" }}>
                                ✓ All hints revealed
                            </span>
                        )}
                        {revealedCount > 0 && (
                            <button onClick={reset} style={{
                                padding: "8px 14px", borderRadius: "7px",
                                border: "1px solid #dee2e6", background: "#fff",
                                color: "#868e96", fontSize: "12px", cursor: "pointer",
                            }}>
                                Reset
                            </button>
                        )}
                    </div>

                    {hints.length === 0 && (
                        <p style={{ fontSize: "13px", color: "#868e96", margin: 0 }}>
                            No hints available for this question.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}