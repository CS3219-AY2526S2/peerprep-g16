import { useState } from "react";
// import Whiteboard from "../components/collaboration/Whiteboard"
import CodeSpace from "../components/collaboration/CodeSpace";
import HintPanel from "../components/collaboration/HintPanel";

const SAMPLE_QUESTION = {
    number: 1,
    title: "Two Sum",
    difficulty: "Hard",
    tags: ["Array", "Hash Table"],
    description: `Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers</em> such that they add up to <code>target</code>.`,
    examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", note: "nums[0] + nums[1] == 9" },
        { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    ],
    constraints: ["2 ≤ nums.length ≤ 10⁴", "-10⁹ ≤ nums[i] ≤ 10⁹", "Only one valid answer exists."],
};

const COLOR_CODES: Record<string, string> = {
    "Easy": "#2a9d8f",
    "Medium": "#dd842bff",
    "Hard": "#ff0000ff",
    "Connected": "#2a9d8f",
    "Connecting": "#dd842bff",
    "Disconnected": "#ff0000ff"

}
type ActivePanel = "whiteboard" | "code";

function Collaboration() {
    const [activePanel, setActivePanel] = useState<ActivePanel>("whiteboard");
    const [codeExpanded, setCodeExpanded] = useState(false);

    const showCode = () => {
        setCodeExpanded(true);
        setActivePanel("code");
    };
    const hideCode = () => {
        setCodeExpanded(false);
        setActivePanel("whiteboard");
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f5f4f2",
            display: "flex",
            flexDirection: "column",
        }}>
            {/* Top bar */}
            <header style={{
                marginTop: "55px",
                padding: "14px 28px",
                background: "#1a1a2e",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}>

                {/* Panel toggle */}
                <div style={{
                    marginLeft: "auto",
                    display: "flex",
                    background: "#2a2a4e",
                    borderRadius: "8px",
                    padding: "3px",
                    gap: "2px",
                }}>
                    {(["whiteboard", "code"] as ActivePanel[]).map((panel) => (
                        <button
                            key={panel}
                            onClick={() => {
                                setActivePanel(panel);
                                if (panel === "code") setCodeExpanded(true);
                                if (panel === "whiteboard") setCodeExpanded(false);
                            }}
                            style={{
                                padding: "5px 14px",
                                borderRadius: "6px",
                                border: "none",
                                background: activePanel === panel ? "#6a4c93" : "transparent",
                                color: activePanel === panel ? "#fff" : "#a9b1d6",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            {panel === "whiteboard" ? "🖊 Whiteboard" : "</> Code"}
                        </button>
                    ))}
                </div>

                {/* Session info */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 12px",
                    background: "#2a2a4e",
                    borderRadius: "8px",
                }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLOR_CODES["Connected"] }} />
                    <span style={{ color: "#a9b1d6", fontSize: "12px" }}>Connected</span>
                </div>
            </header>

            {/* Main layout */}
            <div style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "340px 1fr",
                gap: "0",
                minHeight: 0,
                height: "calc(100vh - 60px)",
            }}>
                {/* Left column: Question + Hints */}
                <div style={{
                    padding: "20px 16px",
                    background: "#fff",
                    borderRight: "1px solid #e9ecef",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                }}>
                    {/* Question card */}
                    <div>
                        {/* Problem header */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                            <span style={{
                                fontSize: "12px",
                                color: "#868e96",
                                fontWeight: 600,
                                minWidth: "24px",
                                paddingTop: "2px",
                            }}>#{SAMPLE_QUESTION.number}</span>
                            <div style={{ flex: 1 }}>
                                <h2 style={{
                                    margin: "0 0 6px",
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    color: "#1a1a2e",
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1.2,
                                }}>
                                    {SAMPLE_QUESTION.title}
                                </h2>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: COLOR_CODES[SAMPLE_QUESTION.difficulty],
                                        background: `${COLOR_CODES[SAMPLE_QUESTION.difficulty]}18`,
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                    }}>
                                        {SAMPLE_QUESTION.difficulty}
                                    </span>
                                    {SAMPLE_QUESTION.tags.map((tag) => (
                                        <span key={tag} style={{
                                            fontSize: "11px",
                                            color: "#6a4c93",
                                            background: "#6a4c9318",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                        }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <p
                            style={{ fontSize: "14px", color: "#495057", lineHeight: "1.7", margin: "0 0 16px" }}
                            dangerouslySetInnerHTML={{ __html: SAMPLE_QUESTION.description }}
                        />

                        {/* Examples */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                            {SAMPLE_QUESTION.examples.map((ex, i) => (
                                <div key={i} style={{
                                    background: "#f8f9fa",
                                    borderRadius: "8px",
                                    padding: "10px 12px",
                                    fontSize: "13px",
                                }}>
                                    <div style={{ fontWeight: 600, color: "#1a1a2e", marginBottom: "4px" }}>Example {i + 1}</div>
                                    <div style={{ fontFamily: "monospace", color: "#495057", lineHeight: 1.6 }}>
                                        <div><span style={{ color: "#868e96" }}>Input: </span>{ex.input}</div>
                                        <div><span style={{ color: "#868e96" }}>Output: </span>{ex.output}</div>
                                        {ex.note && <div style={{ color: "#868e96", fontSize: "12px" }}>// {ex.note}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Constraints */}
                        <div style={{
                            background: "#f8f9fa",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            fontSize: "12px",
                            color: "#495057",
                        }}>
                            <div style={{ fontWeight: 600, color: "#1a1a2e", marginBottom: "6px" }}>Constraints</div>
                            <ul style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.8" }}>
                                {SAMPLE_QUESTION.constraints.map((c, i) => (
                                    <li key={i} style={{ fontFamily: "monospace" }}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Hints */}
                    <HintPanel />
                </div>

                {/* Right column: Whiteboard + Code side by side */}
                <div style={{
                    padding: "20px",
                    display: "flex",
                    gap: "16px",
                    overflow: "hidden",
                    height: "100%",
                }}>
                    {/* Whiteboard */}
                    <div style={{
                        flex: codeExpanded ? "1 1 50%" : "1 1 100%",
                        minWidth: 0,
                        transition: "flex 0.3s ease",
                        display: "flex",
                        flexDirection: "column",
                    }}>
                        {/* <Whiteboard /> */}
                    </div>

                    {/* Code space */}
                    <div style={{
                        flex: codeExpanded ? "1 1 50%" : "0 0 auto",
                        minWidth: 0,
                        transition: "flex 0.3s ease",
                        display: "flex",
                        flexDirection: "column",
                    }}>
                        <CodeSpace isExpanded={codeExpanded} onToggle={codeExpanded ? hideCode : showCode} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Collaboration;