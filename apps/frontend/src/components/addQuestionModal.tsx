import React from 'react';


interface TestCase {
    input: string;
    expectedOutput: string;
}


interface NewQuestion {
    questionId: string;
    title: string;
    topic: string[];
    difficulty: string;
    description: string;
    constraints: string[];
    examples: { input: any; output: any; explanation?: string }[];  // ← ADD THIS
    hints: string[];
    testCases: {
        sample: { input: any; expectedOutput: any }[];
        hidden: { input: any; expectedOutput: any }[];
    };
}



interface AddQuestionModalProps {
    show: boolean;
    newQuestion: NewQuestion;
    setNewQuestion: (q: NewQuestion) => void;
    topicInput: string;
    setTopicInput: (v: string) => void;
    constraintInput: string;
    setConstraintInput: (v: string) => void;
    hintInput: string;
    setHintInput: (v: string) => void;
    sampleInput: string;
    setSampleInput: (v: string) => void;
    sampleOutput: string;
    setSampleOutput: (v: string) => void;
    hiddenInput: string;
    setHiddenInput: (v: string) => void;
    hiddenOutput: string;
    setHiddenOutput: (v: string) => void;
    handleAddQuestion: () => void;
    questionError?: string;
    onClose: () => void;
}


function AddQuestionModal({
    show, newQuestion, setNewQuestion, topicInput, setTopicInput,
    constraintInput, setConstraintInput, hintInput, setHintInput,
    sampleInput, setSampleInput, sampleOutput, setSampleOutput,
    hiddenInput, setHiddenInput, hiddenOutput, setHiddenOutput,
    handleAddQuestion, questionError, onClose
}: AddQuestionModalProps) {
    if (!show) return null;


    return (
        <>
            <div style={styles.modalOverlay}>
                <div style={styles.modalBox}>
                    <h3 style={{ marginBottom: "20px" }}>Add New Question</h3>


                    <label style={styles.modalLabel}>
                        Question ID:
                        <input
                            type="text"
                            value={newQuestion.questionId}
                            onChange={(e) => setNewQuestion({ ...newQuestion, questionId: e.target.value })}
                            style={styles.modalInput}
                        />
                    </label>


                    <label style={styles.modalLabel}>
                        Title:
                        <input
                            type="text"
                            value={newQuestion.title}
                            onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                            style={styles.modalInput}
                        />
                    </label>


                    <label style={styles.modalLabel}>
                        Topics:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Add a topic"
                            />
                            <button
                                onClick={() => {
                                    if (topicInput) {
                                        setNewQuestion({ ...newQuestion, topic: [...newQuestion.topic, topicInput] });
                                        setTopicInput("");
                                    }
                                }}
                                style={styles.promoteButton}
                            >
                                Add
                            </button>
                        </div>
                        {newQuestion.topic.map((t, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>{t}</span>
                                <button
                                    onClick={() => setNewQuestion({ ...newQuestion, topic: newQuestion.topic.filter((_, idx) => idx !== i) })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}
                                >
                                    x
                                </button>
                            </div>
                        ))}
                    </label>


                    <label style={styles.modalLabel}>
                        Difficulty:
                        <select
                            value={newQuestion.difficulty}
                            onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                            style={styles.modalInput}
                        >
                            <option value="">Select...</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </label>


                    <label style={styles.modalLabel}>
                        Description:
                        <textarea
                            value={newQuestion.description}
                            onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                            style={{ ...styles.modalInput, height: "100px", resize: "vertical" as const }}
                        />
                    </label>


                    {/* Constraints */}
                    <label style={styles.modalLabel}>
                        Constraints:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={constraintInput}
                                onChange={(e) => setConstraintInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Add a constraint" />
                            <button onClick={() => {
                                if (constraintInput) {
                                    setNewQuestion({ ...newQuestion, constraints: [...newQuestion.constraints, constraintInput] });
                                    setConstraintInput("");
                                }
                            }} style={styles.promoteButton}>Add</button>
                        </div>
                        {newQuestion.constraints.map((c, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>{c}</span>
                                <button onClick={() => setNewQuestion({ ...newQuestion, constraints: newQuestion.constraints.filter((_, idx) => idx !== i) })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                            </div>
                        ))}
                    </label>



                    {/* Hints */}
                    <label style={styles.modalLabel}>
                        Hints:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={hintInput}
                                onChange={(e) => setHintInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Add a hint" />
                            <button onClick={() => {
                                if (hintInput) {
                                    setNewQuestion({ ...newQuestion, hints: [...newQuestion.hints, hintInput] });
                                    setHintInput("");
                                }
                            }} style={styles.promoteButton}>Add</button>
                        </div>
                        {newQuestion.hints.map((h, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>{h}</span>
                                <button onClick={() => setNewQuestion({ ...newQuestion, hints: newQuestion.hints.filter((_, idx) => idx !== i) })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                            </div>
                        ))}
                    </label>



                    {/* Sample Test Cases */}
                    <label style={styles.modalLabel}>
                        Sample Test Cases:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={sampleInput}
                                onChange={(e) => setSampleInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Input" />
                            <input type="text" value={sampleOutput}
                                onChange={(e) => setSampleOutput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Expected Output" />
                            <button onClick={() => {
                                if (sampleInput && sampleOutput) {
                                    setNewQuestion({ ...newQuestion, testCases: { ...newQuestion.testCases, sample: [...newQuestion.testCases.sample, { input: sampleInput, expectedOutput: sampleOutput }] } });
                                    setSampleInput("");
                                    setSampleOutput("");
                                }
                            }} style={styles.promoteButton}>Add</button>
                        </div>
                        {newQuestion.testCases.sample.map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>Input: {s.input} | Output: {s.expectedOutput}</span>
                                <button onClick={() => setNewQuestion({ ...newQuestion, testCases: { ...newQuestion.testCases, sample: newQuestion.testCases.sample.filter((_, idx) => idx !== i) } })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                            </div>
                        ))}
                    </label>



                    {/* Hidden Test Cases */}
                    <label style={styles.modalLabel}>
                        Hidden Test Cases:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={hiddenInput}
                                onChange={(e) => setHiddenInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Input" />
                            <input type="text" value={hiddenOutput}
                                onChange={(e) => setHiddenOutput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Expected Output" />
                            <button onClick={() => {
                                if (hiddenInput && hiddenOutput) {
                                    setNewQuestion({ ...newQuestion, testCases: { ...newQuestion.testCases, hidden: [...newQuestion.testCases.hidden, { input: hiddenInput, expectedOutput: hiddenOutput }] } });
                                    setHiddenInput("");
                                    setHiddenOutput("");
                                }
                            }} style={styles.promoteButton}>Add</button>
                        </div>
                        {newQuestion.testCases.hidden.map((h, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>Input: {h.input} | Output: {h.expectedOutput}</span>
                                <button onClick={() => setNewQuestion({ ...newQuestion, testCases: { ...newQuestion.testCases, hidden: newQuestion.testCases.hidden.filter((_, idx) => idx !== i) } })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                            </div>
                        ))}
                    </label>


                    <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                        {questionError && <p style={{ color: "red", marginBottom: "10px" }}>{questionError}</p>}
                        <button onClick={handleAddQuestion} style={styles.promoteButton}>
                            Submit
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                            }}
                            style={{ ...styles.promoteButton, backgroundColor: "gray" }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}


const styles: { [key: string]: React.CSSProperties } = {
    modalOverlay: {
        position: "fixed" as const,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    modalBox: {
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "12px",
        width: "500px",
        maxHeight: "80vh",
        overflowY: "auto" as const,
    },
    modalLabel: {
        display: "flex" as const,
        flexDirection: "column" as const,
        gap: "6px",
        marginBottom: "16px",
        fontSize: "14px",
        fontWeight: "bold" as const,
    },
    modalInput: {
        padding: "10px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        fontSize: "14px",
        outline: "none",
        width: "100%",
        boxSizing: "border-box" as const,
    },
    promoteButton: {
        padding: "6px 12px",
        backgroundColor: "#007BFF",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "13px",
    },
};


export default AddQuestionModal;