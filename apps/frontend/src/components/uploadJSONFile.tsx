import React, { useState } from "react";
import styles from "./styles";

interface UploadJSONFileProps {
    show: boolean;
    onClose: () => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    questionError: string;
    questionSuccess: string;
}

function UploadJSONFile({ show, onClose, onUpload, questionError, questionSuccess }: UploadJSONFileProps) {
    if (!show) return null;

    const [previewData, setPreviewData] = useState<any[]>([]);
    const [fileName, setFileName] = useState("");
    const [fileRef, setFileRef] = useState<React.ChangeEvent<HTMLInputElement> | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const exampleJSON = JSON.stringify([
        {
            questionId: "example-id",
            title: "Example Question",
            topic: ["Arrays", "Math"],
            difficulty: "Easy",
            description: "Given an array of integers...",
            constraints: ["1 <= n <= 10^4"],
            examples: [],
            hints: ["Try a brute force approach first."],
            testCases: {
                sample: [{ input: "1 2 3\n2", expectedOutput: "1" }],
                hidden: [{ input: "4 5 6\n5", expectedOutput: "1" }]
            },
            modelAnswer: "function example(arr, target) { return arr.includes(target) ? 1 : 0; }",
            modelAnswerTimeComplexity: "O(n)",
            modelAnswerExplanation: "We check if the target exists in the array using includes(), which takes O(n) time."
        }
    ], null, 2);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setConfirmed(false);
        setExpandedIndex(null);

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const questions = Array.isArray(parsed) ? parsed : [parsed];
            setPreviewData(questions);
            setFileRef(e);
        } catch (err) {
            setPreviewData([]);
            setFileName("");
            alert("Invalid JSON file. Please check the format.");
        }
    };

    const handleConfirm = () => {
        if (fileRef) {
            setConfirmed(true);
            onUpload(fileRef);
        }
    };

    const handleReset = () => {
        setPreviewData([]);
        setFileName("");
        setFileRef(null);
        setConfirmed(false);
        setExpandedIndex(null);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={{ ...styles.modalBox, width: "620px" }}>
                <h3 style={{ marginBottom: "10px" }}>Upload Questions via JSON</h3>

                <p style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
                    Upload a <b>.json</b> file containing one or more questions.
                </p>

                {/* Example JSON — only show before file selected */}
                {!previewData.length && (
                    <div style={styles.exampleBox}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "bold", color: "#333", margin: 0 }}>
                                Example Format:
                            </p>
                        </div>
                        <pre style={styles.examplePre}>
                            {exampleJSON}
                        </pre>
                    </div>
                )}

                {/* Full detail preview — collapsible cards */}
                {previewData.length > 0 && !confirmed && (
                    <div style={styles.previewContainer}>
                        <p style={{ fontSize: "13px", fontWeight: "bold", color: "#333", marginBottom: "10px" }}>
                            Preview — <span style={{ color: "#007BFF" }}>{fileName}</span> ({previewData.length} question{previewData.length > 1 ? "s" : ""} found)
                        </p>

                        <div style={styles.previewScroll}>
                            {previewData.map((q, index) => (
                                <div key={index} style={styles.previewCard}>
                                    <div
                                        style={styles.previewCardHeader}
                                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                    >
                                        <p style={{ margin: 0, fontWeight: "bold", fontSize: "13px" }}>
                                            {index + 1}. {q.title ?? "Untitled"} —{" "}
                                            <span style={{ color: "#666", fontWeight: "normal" }}>{q.difficulty ?? "—"}</span>
                                        </p>
                                        <span style={{ fontSize: "12px", color: "#007BFF" }}>
                                            {expandedIndex === index ? "▲ Hide" : "▼ Show"}
                                        </span>
                                    </div>

                                    {expandedIndex === index && (
                                        <div style={styles.previewCardBody}>
                                            <div><b>Question ID:</b> {q.questionId ?? "—"}</div>

                                            <div>
                                                <b>Topic:</b> {Array.isArray(q.topic) ? q.topic.join(", ") : q.topic ?? "—"}
                                            </div>

                                            <div><b>Description:</b> {q.description ?? "—"}</div>

                                            {q.constraints?.length > 0 && (
                                                <div>
                                                    <b>Constraints:</b>
                                                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
                                                        {q.constraints.map((c: string, i: number) => (
                                                            <li key={i}>{c}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {q.examples?.length > 0 && (
                                                <div>
                                                    <b>Examples:</b>
                                                    {q.examples.map((ex: any, i: number) => (
                                                        <div key={i} style={styles.previewNestedCard}>
                                                            <div><b>Input:</b> {ex.input}</div>
                                                            <div><b>Output:</b> {ex.output}</div>
                                                            {ex.explanation && <div><b>Explanation:</b> {ex.explanation}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {q.hints?.length > 0 && (
                                                <div>
                                                    <b>Hints:</b>
                                                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
                                                        {q.hints.map((h: string, i: number) => (
                                                            <li key={i}>{h}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {q.testCases?.sample?.length > 0 && (
                                                <div>
                                                    <b>Sample Test Cases:</b>
                                                    {q.testCases.sample.map((tc: any, i: number) => (
                                                        <div key={i} style={styles.previewNestedCard}>
                                                            <div><b>Input:</b> {tc.input}</div>
                                                            <div><b>Expected Output:</b> {tc.expectedOutput}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {q.testCases?.hidden?.length > 0 && (
                                                <div>
                                                    <b>Hidden Test Cases:</b> {q.testCases.hidden.length} case{q.testCases.hidden.length > 1 ? "s" : ""}
                                                </div>
                                            )}

                                            {q.modelAnswer && (
                                                <div>
                                                    <b>Model Answer:</b>
                                                    <pre style={styles.previewCodeBlock}>
                                                        {q.modelAnswer}
                                                    </pre>
                                                </div>
                                            )}

                                            {q.modelAnswerTimeComplexity && (
                                                <div><b>Time Complexity:</b> {q.modelAnswerTimeComplexity}</div>
                                            )}

                                            {q.modelAnswerExplanation && (
                                                <div><b>Explanation:</b> {q.modelAnswerExplanation}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {confirmed && questionSuccess && (
                    <div style={styles.successBox}>
                        <p style={{ color: "green", margin: 0, fontSize: "13px" }}>
                            {questionSuccess}
                        </p>
                    </div>
                )}

                {confirmed && questionError && (
                    <div style={styles.errorBox}>
                        <p style={{ color: "red", margin: "0 0 6px 0", fontSize: "13px", fontWeight: "bold" }}>
                            {questionError.split("\n")[0]}
                        </p>
                        {questionError.split("\n").slice(1).map((line, i) => (
                            <p key={i} style={{ color: "red", margin: "2px 0", fontSize: "12px" }}>
                                • {line}
                            </p>
                        ))}
                    </div>
                )}

                <div style={styles.uploadButtonRow}>
                    {!previewData.length && (
                        <>
                            <label htmlFor="upload-json" style={{ ...styles.addQuestionButton, display: "inline-block" }}>
                                Choose JSON File
                            </label>
                            <input
                                id="upload-json"
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />
                        </>
                    )}

                    {previewData.length > 0 && !confirmed && (
                        <>
                            <button onClick={handleReset} style={styles.button}>
                                Reselect
                            </button>
                            <button onClick={handleConfirm} style={styles.acceptButton}>
                                Confirm Upload
                            </button>
                        </>
                    )}

                    {confirmed && (
                        <>
                            {questionError && (
                                <button onClick={handleReset} style={styles.button}>
                                    Try Again
                                </button>
                            )}
                            <button onClick={() => { handleReset(); onClose(); }} style={styles.button}>
                                {questionError ? "Cancel" : "Done"}
                            </button>
                        </>
                    )}

                    {!confirmed && (
                        <button onClick={() => { handleReset(); onClose(); }} style={styles.button}>
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UploadJSONFile;