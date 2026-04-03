import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, Navigate } from "react-router-dom";
import Whiteboard, { type WhiteboardHandle } from "../components/collaboration/Whiteboard";
import CodeSpace from "../components/collaboration/CodeSpace";
import HintPanel from "../components/collaboration/HintPanel";
import VoiceCall from "../components/collaboration/VoiceCall";
import {
    connectSocket,
    disconnectSocket,
    fetchSession,
} from "../api/collaborationService";
import { Socket } from "socket.io-client";

type ActivePanel = "whiteboard" | "code";

type Question = {
    questionId: string;
    title: string;
    topic: string[];
    difficulty: "Easy" | "Medium" | "Hard";
    description: string;
    constraints: string[];
    hints: string[];
    testCases: {
        sample: { input: string; expectedOutput: string }[];
        hidden: { input: string; expectedOutput: string }[];
    };
};

function Collaboration() {
    const { sessionId: matchingId } = useParams<{ sessionId: string }>();
    const stored = localStorage.getItem("login");
    const user = stored ? JSON.parse(stored) : null;
    const userId = user?.id ?? "";

    const [activePanel, setActivePanel] = useState<ActivePanel>("whiteboard");
    const [codeExpanded, setCodeExpanded] = useState(false);
    const [question, setQuestion] = useState<Question | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionState, setConnectionState] = useState<
        "Connected" | "Connecting" | "Disconnected"
    >("Connecting");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [endSessionState, setEndSessionState] = useState<"idle" | "pending" | "declined">("idle");
    const [incomingEndRequest, setIncomingEndRequest] = useState(false);
    const [partnerOnline, setPartnerOnline] = useState<boolean | null>(null);
    const whiteboardRef = useRef<WhiteboardHandle>(null);

    if (!matchingId || !user) return <Navigate to="/" replace />;

    useEffect(() => {
        let mounted = true;

        const bootstrap = async () => {
            try {
                setConnectionState("Connecting");

                const session = await fetchSession(matchingId);

                if (session.status === "active" && session.question) {
                    if (mounted) {
                        setQuestion(session.question);
                        setIsLoading(false);
                    }
                }

                const connectedSocket = connectSocket();
                setSocket(connectedSocket);

                connectedSocket.on("connect", () => {
                    if (mounted) setConnectionState("Connected");
                    connectedSocket.emit("joinSession", { sessionId: matchingId, userId });
                });

                connectedSocket.on("connect_error", (err) => {
                    console.error("WebSocket connection error:", err.message);
                    if (mounted) setConnectionState("Disconnected");
                });

                connectedSocket.on("disconnect", () => {
                    if (mounted) setConnectionState("Disconnected");
                });

                connectedSocket.on("partnerDisconnected", () => {
                    if (mounted) setPartnerOnline(false);
                });

                connectedSocket.on("partnerReconnected", () => {
                    if (mounted) setPartnerOnline(true);
                });

                connectedSocket.on("endSession:request", () => {
                    if (mounted) setIncomingEndRequest(true);
                });

                connectedSocket.on("endSession:decline", () => {
                    if (mounted) {
                        setEndSessionState("declined");
                        setTimeout(() => setEndSessionState("idle"), 2000);
                    }
                });

                connectedSocket.on("endSession:confirmed", () => {
                    window.location.href = "/homepage";
                });

                if (session.status === "waiting") {
                    connectedSocket.on("questionReady", ({ question: q }: { question: Question }) => {
                        if (mounted) {
                            setQuestion(q);
                            setIsLoading(false);
                        }
                    });
                }

            } catch (err: any) {
                console.error("Collaboration bootstrap failed", err);
                if (
                    err.message === "UNAUTHORIZED" ||
                    err.message === "FORBIDDEN" ||
                    err.message === "NOT_FOUND"
                ) {
                    window.location.href = "/homepage";
                    return;
                }
                if (mounted) {
                    setConnectionState("Disconnected");
                    setIsLoading(false);
                }
            }
        };

        bootstrap();

        return () => {
            mounted = false;
            disconnectSocket();
        };
    }, [matchingId, userId]);

    const handleEndSession = () => {
        if (!socket || endSessionState !== "idle") return;
        setEndSessionState("pending");
        socket.emit("endSession:request", { sessionId: matchingId });
    };

    const handleApproveEnd = async () => {
        try {
            const screenshot = await whiteboardRef.current?.captureScreenshot();
            if (screenshot) {
                socket?.emit("whiteboard:screenshot", { sessionId: matchingId, screenshot });
            }
        } catch (err) {
            console.warn("Failed to capture whiteboard screenshot:", err);
        }
        socket?.emit("endSession:approve", { sessionId: matchingId });
        setIncomingEndRequest(false);
    };

    const handleDeclineEnd = () => {
        socket?.emit("endSession:decline", { sessionId: matchingId });
        setIncomingEndRequest(false);
    };

    const showCode = () => { setCodeExpanded(true); setActivePanel("code"); };
    const hideCode = () => { setCodeExpanded(false); setActivePanel("whiteboard"); };

    const difficultyColor = useMemo(() => {
        if (!question) return COLORS.Hard;
        return COLORS[question.difficulty];
    }, [question]);

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div style={styles.panelToggle}>
                    {(["whiteboard", "code"] as ActivePanel[]).map((panel) => (
                        <button
                            key={panel}
                            onClick={() => {
                                setActivePanel(panel);
                                if (panel === "code") setCodeExpanded(true);
                                if (panel === "whiteboard") setCodeExpanded(false);
                            }}
                            style={{
                                ...styles.panelButton,
                                background: activePanel === panel ? "#6a4c93" : "transparent",
                                color: activePanel === panel ? "#fff" : "#a9b1d6",
                            }}
                        >
                            {panel === "whiteboard" ? "🖊 Whiteboard" : "</> Code"}
                        </button>
                    ))}
                </div>

                <div style={styles.sessionInfo}>
                    <div style={{ ...styles.statusDot, background: COLORS[connectionState] }} />
                    <span style={styles.sessionText}>{connectionState}</span>
                </div>

                <VoiceCall socket={socket} sessionId={matchingId} />

                <button
                    onClick={handleEndSession}
                    disabled={endSessionState !== "idle"}
                    style={{
                        ...styles.endButton,
                        opacity: endSessionState !== "idle" ? 0.6 : 1,
                        cursor: endSessionState !== "idle" ? "not-allowed" : "pointer",
                        background: endSessionState === "declined" ? "#dd842b" : "#e63946",
                    }}
                >
                    {endSessionState === "pending" ? "Waiting for peer…" : endSessionState === "declined" ? "Peer declined" : "End Session"}
                </button>
            </header>

            {partnerOnline === false && (
                <div style={styles.partnerDisconnectedBanner}>
                    <span style={{ fontSize: "14px" }}>
                        ⚠️ Your partner has disconnected. Session will auto-close if they don't rejoin within 2 minutes.
                    </span>
                </div>
            )}

            {incomingEndRequest && endSessionState !== "pending" && (
                <div style={styles.endRequestBanner}>
                    <span style={{ fontSize: "14px", color: "#1a1a2e" }}>
                        Your peer wants to end the session.
                    </span>
                    <button onClick={handleApproveEnd} style={styles.approveEndBtn}>Confirm</button>
                    <button onClick={handleDeclineEnd} style={styles.declineEndBtn}>Cancel</button>
                </div>
            )}

            <div style={styles.layoutGrid}>
                <div style={styles.questionColumn}>
                    <div>
                        <div style={styles.problemHeader}>
                            <div style={{ flex: 1 }}>
                                <h2 style={styles.problemTitle}>
                                    {isLoading ? "Loading question..." : question?.title}
                                </h2>
                                <div style={styles.tagRow}>
                                    {question && (
                                        <span style={{
                                            ...styles.difficultyTag,
                                            color: difficultyColor,
                                            background: `${difficultyColor}18`,
                                        }}>
                                            {question.difficulty}
                                        </span>
                                    )}
                                    {question?.topic && (
                                        question?.topic.map(x => <span style={styles.tag}>{x}</span>)
                                    )}
                                </div>
                            </div>
                        </div>

                        <p style={styles.description}>{question?.description ?? ""}</p>

                        <div style={styles.constraintsCard}>
                            <div style={styles.constraintsTitle}>Constraints</div>
                            <ul style={styles.constraintsList}>
                                {question?.constraints.map((c, i) => (
                                    <li key={i} style={styles.constraint}>{c}</li>
                                ))}
                            </ul>
                        </div>

                        <div style={styles.constraintsCard}>
                            <div style={styles.constraintsTitle}>Sample Test Cases</div>
                            <ul style={styles.constraintsList}>
                                {question?.testCases.sample.map((tc, i) => (
                                    <li key={i} style={styles.constraint}>
                                        Input: {tc.input} → Output: {tc.expectedOutput}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <HintPanel
                        hints={question?.hints ?? []}
                        socket={socket}
                        sessionId={matchingId}
                        userId={userId}
                    />
                </div>

                <div style={styles.rightColumn}>
                    <div style={{ ...styles.whiteboard, flex: codeExpanded ? "1 1 50%" : "1 1 100%" }}>
                        <Whiteboard
                            ref={whiteboardRef}
                            sessionId={matchingId}
                            userId={userId}
                            socket={socket}
                        />
                    </div>
                    <div style={{ ...styles.codeSpace, flex: codeExpanded ? "1 1 50%" : "0 0 auto" }}>
                        <CodeSpace
                            isExpanded={codeExpanded}
                            onToggle={codeExpanded ? hideCode : showCode}
                            sessionId={matchingId}
                            userId={userId}
                            socket={socket}
                            testCases={question?.testCases.sample ?? []}
                            questionId={question?.questionId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Collaboration;

const COLORS: Record<string, string> = {
    Easy: "#2a9d8f",
    Medium: "#dd842bff",
    Hard: "#ff0000ff",
    Connected: "#2a9d8f",
    Connecting: "#dd842bff",
    Disconnected: "#ff0000ff",
};

const styles: Record<string, CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f4f2", display: "flex", flexDirection: "column" },
    header: {
        marginTop: "55px", padding: "14px 28px", background: "#1a1a2e",
        display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    },
    panelToggle: {
        marginLeft: "auto", display: "flex", background: "#2a2a4e",
        borderRadius: "8px", padding: "3px", gap: "2px",
    },
    panelButton: {
        padding: "5px 14px", borderRadius: "6px", border: "none",
        fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
    },
    sessionInfo: {
        display: "flex", alignItems: "center", gap: "6px",
        padding: "5px 12px", background: "#2a2a4e", borderRadius: "8px",
    },
    endButton: {
        padding: "6px 14px", background: "#e63946", color: "#fff",
        border: "none", borderRadius: "8px", cursor: "pointer",
        fontSize: "12px", fontWeight: 600,
    },
    statusDot: { width: "8px", height: "8px", borderRadius: "50%" },
    sessionText: { color: "#a9b1d6", fontSize: "12px", textTransform: "capitalize" },
    layoutGrid: {
        flex: 1, display: "grid", gridTemplateColumns: "340px 1fr",
        gap: "0", minHeight: 0, height: "calc(100vh - 60px)",
    },
    questionColumn: {
        padding: "20px 16px", background: "#fff", borderRight: "1px solid #e9ecef",
        overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px",
    },
    problemHeader: { display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" },
    problemTitle: {
        margin: "0 0 6px", fontSize: "18px", fontWeight: 700,
        color: "#1a1a2e", letterSpacing: "-0.02em", lineHeight: 1.2,
    },
    tagRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
    difficultyTag: { fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" },
    tag: { fontSize: "11px", color: "#6a4c93", background: "#6a4c9318", padding: "2px 8px", borderRadius: "12px" },
    description: { fontSize: "14px", color: "#495057", lineHeight: "1.7", margin: "0 0 16px" },
    constraintsCard: { background: "#f8f9fa", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#495057", marginBottom: "12px" },
    constraintsTitle: { fontWeight: 600, color: "#1a1a2e", marginBottom: "6px" },
    constraintsList: { margin: 0, paddingLeft: "16px", lineHeight: "1.8" },
    constraint: { fontFamily: "monospace" },
    rightColumn: { padding: "20px", display: "flex", gap: "16px", overflow: "hidden", height: "100%" },
    whiteboard: { minWidth: 0, height: 1000, transition: "flex 0.3s ease", display: "flex", flexDirection: "column" },
    codeSpace: { minWidth: 0, transition: "flex 0.3s ease", display: "flex", flexDirection: "column" },
    partnerDisconnectedBanner: {
        display: "flex", alignItems: "center", gap: "12px", padding: "10px 28px",
        background: "#2a2a4e", color: "#f4a261", borderBottom: "1px solid #f4a261",
    },
    endRequestBanner: {
        display: "flex", alignItems: "center", gap: "12px", padding: "10px 28px",
        background: "#fff3cd", borderBottom: "1px solid #ffc107",
    },
    approveEndBtn: {
        padding: "5px 14px", background: "#e63946", color: "#fff",
        border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    },
    declineEndBtn: {
        padding: "5px 14px", background: "transparent", color: "#495057",
        border: "1px solid #adb5bd", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
    },
};