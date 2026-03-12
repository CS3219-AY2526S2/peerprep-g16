import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Whiteboard from "../components/collaboration/Whiteboard";
import CodeSpace from "../components/collaboration/CodeSpace";
import HintPanel from "../components/collaboration/HintPanel";

type ActivePanel = "whiteboard" | "code";

type Question = {
    number: number;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    tags: string[];
    description: string;
    examples: { input: string; output: string; note?: string }[];
    constraints: string[];
};

type CollaborationProps = {
    matchingId: string;
    userId: string;
    peerId: string;
};

function Collaboration({ matchingId, userId, peerId }: CollaborationProps) {
    void peerId; // placeholder until peer-specific features are wired to backend
    const [activePanel, setActivePanel] = useState<ActivePanel>("whiteboard");
    const [codeExpanded, setCodeExpanded] = useState(false);
    const [question, setQuestion] = useState<Question | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionState, setConnectionState] = useState<
        "Connected" | "Connecting" | "Disconnected"
    >("Connecting");

    useEffect(() => {
        let mounted = true;
        const bootstrapCollaboration = async () => {
            try {
                setConnectionState("Connecting");
                // 1) Create/join collaboration session with backend using matchingId, userId, peerId
                // const session = await collaborationService.createSession({ matchingId, userId, peerId });

                // 2) Fetch interview question
                const fetchedQuestion = await mockFetchQuestion();
                if (mounted) setQuestion(fetchedQuestion);

                // 3) Setup realtime whiteboard (Excalidraw + sockets)
                // await collaborationService.joinWhiteboard(session.id, { userId });

                setConnectionState("Connected");
            } catch (err) {
                console.error("Collaboration bootstrap failed", err);
                setConnectionState("Disconnected");
            } finally {
                setIsLoading(false);
            }
        };

        bootstrapCollaboration();
        return () => {
            mounted = false;
            // 4) Flush collaboration history to backend (whiteboard image, code, chat)
            // collaborationService.teardown(session.id)
        };
    }, [matchingId, userId, peerId]);

    const showCode = () => {
        setCodeExpanded(true);
        setActivePanel("code");
    };

    const hideCode = () => {
        setCodeExpanded(false);
        setActivePanel("whiteboard");
    };

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
            </header>

            <div style={styles.layoutGrid}>
                <div style={styles.questionColumn}>
                    <div>
                        <div style={styles.problemHeader}>
                            <span style={styles.problemNumber}>#{question?.number ?? "-"}</span>
                            <div style={{ flex: 1 }}>
                                <h2 style={styles.problemTitle}>
                                    {isLoading ? "Loading question..." : question?.title}
                                </h2>
                                <div style={styles.tagRow}>
                                    <span
                                        style={{
                                            ...styles.difficultyTag,
                                            color: difficultyColor,
                                            background: `${difficultyColor}18`,
                                        }}
                                    >
                                        {question?.difficulty ?? ""}
                                    </span>
                                    {question?.tags.map((tag) => (
                                        <span key={tag} style={styles.tag}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p
                            style={styles.description}
                            dangerouslySetInnerHTML={{ __html: question?.description ?? "" }}
                        />

                        <div style={styles.examplesWrapper}>
                            {question?.examples.map((ex, i) => (
                                <div key={i} style={styles.exampleCard}>
                                    <div style={styles.exampleTitle}>Example {i + 1}</div>
                                    <div style={styles.exampleBody}>
                                        <div>
                                            <span style={styles.exampleLabel}>Input: </span>
                                            {ex.input}
                                        </div>
                                        <div>
                                            <span style={styles.exampleLabel}>Output: </span>
                                            {ex.output}
                                        </div>
                                        {ex.note && <div style={styles.exampleNote}>// {ex.note}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={styles.constraintsCard}>
                            <div style={styles.constraintsTitle}>Constraints</div>
                            <ul style={styles.constraintsList}>
                                {question?.constraints.map((c, i) => (
                                    <li key={i} style={styles.constraint}>
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <HintPanel />
                </div>

                <div style={styles.rightColumn}>
                    <div
                        style={{
                            ...styles.whiteboard,
                            flex: codeExpanded ? "1 1 50%" : "1 1 100%",
                        }}
                    >
                        <Whiteboard sessionId={matchingId} userId={userId} />
                    </div>

                    <div
                        style={{
                            ...styles.codeSpace,
                            flex: codeExpanded ? "1 1 50%" : "0 0 auto",
                        }}
                    >
                        <CodeSpace isExpanded={codeExpanded} onToggle={codeExpanded ? hideCode : showCode} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Collaboration;

// --- Styles (keep visual definitions grouped here) ---
const COLORS: Record<string, string> = {
    Easy: "#2a9d8f",
    Medium: "#dd842bff",
    Hard: "#ff0000ff",
    Connected: "#2a9d8f",
    Connecting: "#dd842bff",
    Disconnected: "#ff0000ff",
};

const styles: Record<string, CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "#f5f4f2",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        marginTop: "55px",
        padding: "14px 28px",
        background: "#1a1a2e",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    },
    panelToggle: {
        marginLeft: "auto",
        display: "flex",
        background: "#2a2a4e",
        borderRadius: "8px",
        padding: "3px",
        gap: "2px",
    },
    panelButton: {
        padding: "5px 14px",
        borderRadius: "6px",
        border: "none",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
    },
    sessionInfo: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        background: "#2a2a4e",
        borderRadius: "8px",
    },
    statusDot: { width: "8px", height: "8px", borderRadius: "50%" },
    sessionText: { color: "#a9b1d6", fontSize: "12px", textTransform: "capitalize" },
    layoutGrid: {
        flex: 1,
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: "0",
        minHeight: 0,
        height: "calc(100vh - 60px)",
    },
    questionColumn: {
        padding: "20px 16px",
        background: "#fff",
        borderRight: "1px solid #e9ecef",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    problemHeader: { display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" },
    problemNumber: { fontSize: "12px", color: "#868e96", fontWeight: 600, minWidth: "24px", paddingTop: "2px" },
    problemTitle: {
        margin: "0 0 6px",
        fontSize: "18px",
        fontWeight: 700,
        color: "#1a1a2e",
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
    },
    tagRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
    difficultyTag: {
        fontSize: "11px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "12px",
    },
    tag: {
        fontSize: "11px",
        color: "#6a4c93",
        background: "#6a4c9318",
        padding: "2px 8px",
        borderRadius: "12px",
    },
    description: { fontSize: "14px", color: "#495057", lineHeight: "1.7", margin: "0 0 16px" },
    examplesWrapper: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" },
    exampleCard: { background: "#f8f9fa", borderRadius: "8px", padding: "10px 12px", fontSize: "13px" },
    exampleTitle: { fontWeight: 600, color: "#1a1a2e", marginBottom: "4px" },
    exampleBody: { fontFamily: "monospace", color: "#495057", lineHeight: 1.6 },
    exampleLabel: { color: "#868e96" },
    exampleNote: { color: "#868e96", fontSize: "12px" },
    constraintsCard: {
        background: "#f8f9fa",
        borderRadius: "8px",
        padding: "10px 12px",
        fontSize: "12px",
        color: "#495057",
    },
    constraintsTitle: { fontWeight: 600, color: "#1a1a2e", marginBottom: "6px" },
    constraintsList: { margin: 0, paddingLeft: "16px", lineHeight: "1.8" },
    constraint: { fontFamily: "monospace" },
    rightColumn: { padding: "20px", display: "flex", gap: "16px", overflow: "hidden", height: "100%" },
    whiteboard: {
        minWidth: 0,
        height: 1000,
        transition: "flex 0.3s ease",
        display: "flex",
        flexDirection: "column",
    },
    codeSpace: {
        minWidth: 0,
        transition: "flex 0.3s ease",
        display: "flex",
        flexDirection: "column",
    },
};

// Temporary stub until backend wiring is ready
async function mockFetchQuestion(): Promise<Question> {
    return Promise.resolve({
        number: 1,
        title: "Two Sum",
        difficulty: "Hard",
        tags: ["Array", "Hash Table"],
        description:
            "Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers</em> such that they add up to <code>target</code>.",
        examples: [
            { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", note: "nums[0] + nums[1] == 9" },
            { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
        ],
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Only one valid answer exists."],
    });
}
