import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Socket } from "socket.io-client";

interface HintPanelProps {
    hints?: string[];
    socket: Socket | null;
    sessionId: string;
    userId: string;
}

type RequestState = "idle" | "pending" | "declined";

export default function HintPanel({ hints = [], socket, sessionId }: HintPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [revealedCount, setRevealedCount] = useState(0);
    const [requestState, setRequestState] = useState<RequestState>("idle");
    const [incomingRequest, setIncomingRequest] = useState<number | null>(null);

    const declineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!socket) return;

        const handleHintState = ({ revealedCount: count }: { revealedCount: number }) => {
            setRevealedCount(count);
        };

        const handleHintRequest = ({ hintIndex }: { hintIndex: number }) => {
            setIncomingRequest(hintIndex);
            setIsOpen(true);
        };

        const handleHintApprove = ({ hintIndex }: { hintIndex: number }) => {
            setRevealedCount(hintIndex + 1);
            setRequestState("idle");
        };

        const handleHintDecline = () => {
            setRequestState("declined");
            declineTimerRef.current = setTimeout(() => setRequestState("idle"), 2000);
        };

        socket.on("hintState", handleHintState);
        socket.on("hint:request", handleHintRequest);
        socket.on("hint:approve", handleHintApprove);
        socket.on("hint:decline", handleHintDecline);

        return () => {
            socket.off("hintState", handleHintState);
            socket.off("hint:request", handleHintRequest);
            socket.off("hint:approve", handleHintApprove);
            socket.off("hint:decline", handleHintDecline);
            if (declineTimerRef.current) clearTimeout(declineTimerRef.current);
        };
    }, [socket]);

    function sendRequest() {
        if (!socket || requestState !== "idle") return;
        socket.emit("hint:request", { sessionId, hintIndex: revealedCount });
        setRequestState("pending");
    }

    function approveRequest() {
        if (!socket || incomingRequest === null) return;
        const idx = incomingRequest;
        socket.emit("hint:approve", { sessionId, hintIndex: idx });
        setRevealedCount(idx + 1);
        setIncomingRequest(null);
    }

    function declineRequest() {
        if (!socket) return;
        socket.emit("hint:decline", { sessionId });
        setIncomingRequest(null);
    }

    const hasMoreHints = revealedCount < hints.length;

    const requestBtnLabel =
        requestState === "pending" ? "Waiting for peer…" :
        requestState === "declined" ? "Peer declined" :
        revealedCount === 0 ? "Request hint viewing" : "Request next hint →";

    const requestBtnStyle: CSSProperties = {
        ...styles.btn,
        ...(requestState === "pending" ? styles.btnPending : {}),
        ...(requestState === "declined" ? styles.btnDeclined : {}),
        ...(requestState === "idle" ? styles.btnYellow : {}),
    };

    return (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e9ecef" }}>
            {/* Header toggle */}
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
                        <span style={styles.badge}>
                            {revealedCount}/{hints.length} shown
                        </span>
                    )}
                    {incomingRequest !== null && (
                        <span style={styles.badgeAlert}>
                            Peer requesting!
                        </span>
                    )}
                </div>
                <span style={{
                    fontSize: "18px", color: "#868e96",
                    transform: isOpen ? "rotate(90deg)" : "rotate(270deg)",
                    transition: "transform 0.2s", display: "inline-block",
                }}>
                    ‹
                </span>
            </button>

            {isOpen && (
                <div style={{ background: "#fef9ee", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>

                    {/* Incoming request banner */}
                    {incomingRequest !== null && (
                        <div style={styles.incomingBanner}>
                            <div style={styles.incomingText}>
                                <span style={{ fontSize: "16px" }}>🔔</span>
                                <span>
                                    Your peer wants to reveal <strong>Hint {incomingRequest + 1}</strong>. Allow this?
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={approveRequest} style={styles.btnAllow}>Allow</button>
                                <button onClick={declineRequest} style={styles.btnDeclineAction}>Decline</button>
                            </div>
                        </div>
                    )}

                    {/* Revealed hints */}
                    {hints.slice(0, revealedCount).map((hint, idx) => (
                        <div key={idx} style={styles.hintCard}>
                            <div style={styles.hintLabel}>Hint {idx + 1}</div>
                            <p style={styles.hintText}>{hint}</p>
                        </div>
                    ))}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", alignItems: "center" }}>
                        {hasMoreHints && incomingRequest === null && (
                            <div style={{ position: "relative", display: "inline-block" }}>
                                <button
                                    onClick={sendRequest}
                                    disabled={requestState !== "idle"}
                                    style={requestBtnStyle}
                                    title="Sends a request to your peer — both of you must agree before the hint is revealed"
                                >
                                    {requestBtnLabel}
                                </button>
                                {requestState === "idle" && (
                                    <div style={styles.subtext}>
                                        Requires peer approval
                                    </div>
                                )}
                            </div>
                        )}

                        {!hasMoreHints && hints.length > 0 && (
                            <span style={{ fontSize: "12px", color: "#2a9d8f", fontWeight: 500, alignSelf: "center" }}>
                                ✓ All hints revealed
                            </span>
                        )}

                        {revealedCount > 0 && (
                            <button onClick={() => setIsOpen(false)} style={styles.btnReset}>
                                Hide hints
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

const styles: Record<string, CSSProperties> = {
    badge: {
        background: "#e9c46a22", color: "#b07d00", fontSize: "11px",
        fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
        border: "1px solid #e9c46a55",
    },
    badgeAlert: {
        background: "#ff634722", color: "#c0392b", fontSize: "11px",
        fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
        border: "1px solid #ff634755", animation: "pulse 1s infinite",
    },
    incomingBanner: {
        marginTop: "10px",
        padding: "12px 14px",
        borderRadius: "8px",
        background: "#fff3cd",
        border: "1px solid #ffc107",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    incomingText: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        color: "#495057",
    },
    hintCard: {
        padding: "12px 14px", borderRadius: "8px", background: "#fff",
        borderLeft: "3px solid #e9c46a", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    },
    hintLabel: {
        fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const,
        letterSpacing: "0.08em", color: "#e9c46a", marginBottom: "5px",
    },
    hintText: { margin: 0, fontSize: "13px", color: "#495057", lineHeight: "1.6" },
    btn: {
        padding: "8px 16px", borderRadius: "7px",
        fontSize: "12px", fontWeight: 600, cursor: "pointer",
        border: "1px solid transparent", transition: "opacity 0.15s",
    },
    btnYellow: {
        background: "#e9c46a", border: "1px solid #e9c46a", color: "#7a5800",
    },
    btnPending: {
        background: "#f0f0f0", border: "1px solid #dee2e6", color: "#868e96", cursor: "not-allowed",
    },
    btnDeclined: {
        background: "#fff3cd", border: "1px solid #ffc107", color: "#856404", cursor: "not-allowed",
    },
    subtext: {
        fontSize: "10px", color: "#868e96", marginTop: "3px",
        textAlign: "center" as const, fontStyle: "italic",
    },
    btnAllow: {
        padding: "6px 14px", borderRadius: "6px",
        background: "#2a9d8f", border: "none", color: "#fff",
        fontSize: "12px", fontWeight: 600, cursor: "pointer",
    },
    btnDeclineAction: {
        padding: "6px 14px", borderRadius: "6px",
        background: "#fff", border: "1px solid #dee2e6", color: "#868e96",
        fontSize: "12px", cursor: "pointer",
    },
    btnReset: {
        padding: "8px 14px", borderRadius: "7px",
        border: "1px solid #dee2e6", background: "#fff",
        color: "#868e96", fontSize: "12px", cursor: "pointer",
    },
};
