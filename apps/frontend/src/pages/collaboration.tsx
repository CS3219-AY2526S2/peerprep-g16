import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Whiteboard from "../components/collaboration/Whiteboard";
import CodeSpace from "../components/collaboration/CodeSpace";
import HintPanel from "../components/collaboration/HintPanel";
import {
    connectSocket,
    disconnectSocket,
    fetchSession,
    endSession,
} from "../api/collaborationService";
import { Socket } from "socket.io-client";

type ActivePanel = "whiteboard" | "code";

type Question = {
    questionId: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    topic: string;
    description: string;
    constraints: string[];
    hints: string[];
    testCases: {
        sample: { input: string; expectedOutput: string }[];
        hidden: { input: string; expectedOutput: string }[];
    };
};

type CollaborationProps = {
    matchingId: string;
    userId: string;
    peerId: string;
};

function Collaboration({ matchingId, userId, peerId }: CollaborationProps) {
    void peerId;
    const [activePanel, setActivePanel] = useState<ActivePanel>("whiteboard");
    const [codeExpanded, setCodeExpanded] = useState(false);
    const [question, setQuestion] = useState<Question | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionState, setConnectionState] = useState<
        "Connected" | "Connecting" | "Disconnected"
    >("Connecting");
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        let mounted = true;

        const bootstrap = async () => {
            try {
                setConnectionState("Connecting");

                // 1) fetch session from collab service
                const session = await fetchSession(matchingId);

                // 2) if question already ready, set it
                if (session.status === "active" && session.question) {
                    if (mounted) {
                        setQuestion(session.question);
                        setIsLoading(false);
                    }
                }

                // 3) connect WebSocket
                const socket = connectSocket();
                socketRef.current = socket;

                socket.on("connect", () => {
                    if (mounted) setConnectionState("Connected");
                    // join the session room
                    socket.emit("joinSession", { sessionId: matchingId, userId });
                });

                socket.on("connect_error", (err) => {
                    console.error("WebSocket connection error:", err.message);
                    if (mounted) setConnectionState("Disconnected");
                });

                socket.on("disconnect", () => {
                    if (mounted) setConnectionState("Disconnected");
                });

                // 4) if session was 'waiting', listen for questionReady
                if (session.status === "waiting") {
                    socket.on("questionReady", ({ question: q }: { question: Question }) => {
                        if (mounted) {
                            setQuestion(q);
                            setIsLoading(false);
                        }
                    });
                }

            } catch (err: any) {
                console.error("Collaboration bootstrap failed", err);
                if (
                    err.message === "FORBIDDEN" ||
                    err.message === "NOT_FOUND" ||
                    err.message === "Failed to fetch session"  // catches 401 too
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

    const handleEndSession = async () => {
        const confirmed = window.confirm("Are you sure you want to end the session?");
        if (!confirmed) return;
        try {
            await endSession(matchingId);
            window.location.href = "/homepage";
        } catch (err) {
            console.error("Failed to end session", err);
        }
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

                <button onClick={handleEndSession} style={styles.endButton}>
                    End Session
                </button>
            </header>

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
                                        <span
                                            style={{
                                                ...styles.difficultyTag,
                                                color: difficultyColor,
                                                background: `${difficultyColor}18`,
                                            }}
                                        >
                                            {question.difficulty}
                                        </span>
                                    )}
                                    {question?.topic && (
                                        <span style={styles.tag}>{question.topic}</span>
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

                    <HintPanel />
                </div>

                <div style={styles.rightColumn}>
                    <div style={{ ...styles.whiteboard, flex: codeExpanded ? "1 1 50%" : "1 1 100%" }}>
                        <Whiteboard
                            sessionId={matchingId}
                            userId={userId}
                            socket={socketRef.current}
                        />
                    </div>
                    <div style={{ ...styles.codeSpace, flex: codeExpanded ? "1 1 50%" : "0 0 auto" }}>
                        <CodeSpace
                            isExpanded={codeExpanded}
                            onToggle={codeExpanded ? hideCode : showCode}
                            sessionId={matchingId}
                            userId={userId}
                            socket={socketRef.current}
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
};