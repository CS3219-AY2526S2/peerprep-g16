import React from 'react';

interface TestCase {
    input: any;
    expectedOutput: any;
}

interface EditQuestion {
    questionId: string;
    title: string;
    topic: string | string[];
    difficulty: string;
    description: string;
    constraints: string[];
    hints: string[];
    testCases: {
        sample: TestCase[];
        hidden: TestCase[];
    };
    // Add other fields as needed
}

interface EditQuestionModalProps {
    show: boolean;
    editQuestion: EditQuestion | null;
    setEditQuestion: (q: EditQuestion | null) => void;
    editTopicInput: string;
    setEditTopicInput: (v: string) => void;
    editConstraintInput: string;
    setEditConstraintInput: (v: string) => void;
    editHintInput: string;
    setEditHintInput: (v: string) => void;
    editSampleInput: string;
    setEditSampleInput: (v: string) => void;
    editSampleOutput: string;
    setEditSampleOutput: (v: string) => void;
    editHiddenInput: string;
    setEditHiddenInput: (v: string) => void;
    editHiddenOutput: string;
    setEditHiddenOutput: (v: string) => void;
    handleEditQuestion: () => void;
    questionError?: string;
    onClose: () => void;
}

function EditQuestionModal({
    show,
    editQuestion,
    setEditQuestion,
    editTopicInput, setEditTopicInput,
    editConstraintInput, setEditConstraintInput,
    editHintInput, setEditHintInput,
    editSampleInput, setEditSampleInput,
    editSampleOutput, setEditSampleOutput,
    editHiddenInput, setEditHiddenInput,
    editHiddenOutput, setEditHiddenOutput,
    handleEditQuestion,
    questionError,
    onClose
}: EditQuestionModalProps) {
    if (!show || !editQuestion) return null;

    return (
        <>
            <div style={styles.modalOverlay}>
                <div style={styles.modalBox}>
                    <h3 style={{ marginBottom: "20px" }}>Edit Question</h3>

                    <label style={styles.modalLabel}>
                        Question ID:
                        <input
                            type="text"
                            value={editQuestion.questionId}
                            disabled
                            style={{ ...styles.modalInput, backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                        />
                    </label>

                    <label style={styles.modalLabel}>
                        Title:
                        <input
                            type="text"
                            value={editQuestion.title}
                            onChange={(e) => setEditQuestion({ ...editQuestion, title: e.target.value })}
                            style={styles.modalInput}
                        />
                    </label>

                    <label style={styles.modalLabel}>
                        Topics:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                value={editTopicInput}
                                onChange={(e) => setEditTopicInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Add a topic"
                            />
                            <button
                                onClick={() => {
                                    if (editTopicInput) {
                                        setEditQuestion({
                                            ...editQuestion,
                                            topic: [...(Array.isArray(editQuestion.topic) ? editQuestion.topic : [editQuestion.topic]), editTopicInput]
                                        });
                                        setEditTopicInput("");
                                    }
                                }}
                                style={styles.promoteButton}
                            >
                                Add
                            </button>
                        </div>
                        {(Array.isArray(editQuestion.topic) ? editQuestion.topic : [editQuestion.topic]).map((t: string, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>{t}</span>
                                <button
                                    onClick={() => setEditQuestion({
                                        ...editQuestion,
                                        topic: (Array.isArray(editQuestion.topic) ? editQuestion.topic : [editQuestion.topic]).filter((_: any, idx: number) => idx !== i)
                                    })}
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
                            value={editQuestion.difficulty}
                            onChange={(e) => setEditQuestion({ ...editQuestion, difficulty: e.target.value })}
                            style={styles.modalInput}
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </label>

                    <label style={styles.modalLabel}>
                        Description:
                        <textarea
                            value={editQuestion.description}
                            onChange={(e) => setEditQuestion({ ...editQuestion, description: e.target.value })}
                            style={{ ...styles.modalInput, height: "100px", resize: "vertical" as const }}
                        />
                    </label>

                    {/* Constraints */}
                    <label style={styles.modalLabel}>
                        Constraints:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                type="text"
                                value={editConstraintInput}
                                onChange={(e) => setEditConstraintInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Add a constraint"
                            />
                            <button
                                onClick={() => {
                                    if (editConstraintInput) {
                                        setEditQuestion({ ...editQuestion, constraints: [...(editQuestion.constraints || []), editConstraintInput] });
                                        setEditConstraintInput("");
                                    }
                                }}
                                style={styles.promoteButton}
                            >
                                Add
                            </button>
                        </div>
                        {(editQuestion.constraints || []).map((c: string, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>{c}</span>
                                <button
                                    onClick={() => setEditQuestion({ ...editQuestion, constraints: (editQuestion.constraints || []).filter((_: any, idx: number) => idx !== i) })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}
                                >
                                    x
                                </button>
                            </div>
                        ))}
                    </label>

                    {/* Hints */}
                    <label style={styles.modalLabel}>
                        Hints:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={editHintInput}
                                onChange={(e) => setEditHintInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Add a hint" />
                            <button onClick={() => {
                                if (editHintInput) {
                                    setEditQuestion({ ...editQuestion, hints: [...(editQuestion.hints || []), editHintInput] });
                                    setEditHintInput("");
                                }
                            }} style={styles.promoteButton}>Add</button>
                        </div>
                        {(editQuestion.hints || []).map((h: string, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>{h}</span>
                                <button onClick={() => setEditQuestion({ ...editQuestion, hints: editQuestion.hints.filter((_: any, idx: number) => idx !== i) })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                            </div>
                        ))}
                    </label>

                    {/* Sample Test Cases */}
                    <label style={styles.modalLabel}>
                        Sample Test Cases:
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={editSampleInput}
                                onChange={(e) => setEditSampleInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Input" />
                            <input type="text" value={editSampleOutput}
                                onChange={(e) => setEditSampleOutput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Expected Output" />
                            <button onClick={() => {
                                if (editSampleInput && editSampleOutput) {
                                    setEditQuestion({ ...editQuestion, testCases: { ...editQuestion.testCases, sample: [...(editQuestion.testCases.sample || []), { input: editSampleInput, expectedOutput: editSampleOutput }] } });
                                    setEditSampleInput("");
                                    setEditSampleOutput("");
                                }
                            }} style={styles.promoteButton}>Add</button>
                        </div>
                        {(editQuestion.testCases.sample || []).map((s: any, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>Input: {s.input} | Output: {s.expectedOutput}</span>
                                <button onClick={() => setEditQuestion({ ...editQuestion, testCases: { ...editQuestion.testCases, sample: editQuestion.testCases.sample.filter((_: any, idx: number) => idx !== i) } })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                            </div>
                        ))}
                    </label>

                    {/* Hidden Test Cases */}
                    <label style={styles.modalLabel}>
                        Hidden Test Cases: <span style={{ color: "red" }}>*</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={editHiddenInput}
                                onChange={(e) => setEditHiddenInput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Input" />
                            <input type="text" value={editHiddenOutput}
                                onChange={(e) => setEditHiddenOutput(e.target.value)}
                                style={{ ...styles.modalInput, flex: 1 }}
                                placeholder="Expected Output" />
                            <button onClick={() => {
                                if (editHiddenInput && editHiddenOutput) {
                                    setEditQuestion({ ...editQuestion, testCases: { ...editQuestion.testCases, hidden: [...(editQuestion.testCases.hidden || []), { input: editHiddenInput, expectedOutput: editHiddenOutput }] } });
                                    setEditHiddenInput("");
                                    setEditHiddenOutput("");
                                }
                            }} style={styles.promoteButton}>Add</button>
                        </div>
                        {(editQuestion.testCases.hidden || []).map((h: any, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                <span>Input: {h.input} | Output: {h.expectedOutput}</span>
                                <button onClick={() => setEditQuestion({ ...editQuestion, testCases: { ...editQuestion.testCases, hidden: editQuestion.testCases.hidden.filter((_: any, idx: number) => idx !== i) } })}
                                    style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                            </div>
                        ))}
                    </label>

                    {questionError && <p style={{ color: "red", marginBottom: "10px" }}>{questionError}</p>}
                    <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                        <button onClick={handleEditQuestion} style={styles.promoteButton}>
                            Save
                        </button>
                        <button
                            onClick={onClose}
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

export default EditQuestionModal;
