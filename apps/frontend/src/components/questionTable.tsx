import React from "react";
import { useNavigate } from "react-router-dom";
import webStyles from "./styles";

interface QuestionTableProps {
    questions: any[];
    filteredQuestions: any[];
    questionSearchQuery: string;
    setQuestionSearchQuery: (v: string) => void;
    filterTopic: string;
    setFilterTopic: (v: string) => void;
    filterDifficulty: string;
    setFilterDifficulty: (v: string) => void;
    sortField: string;
    sortOrder: string;
    handleSort: (field: string) => void;
    handleDeleteQuestion: (id: string) => void;
    setEditQuestion: (q: any) => void;
    setShowEditQuestion: (v: boolean) => void;
    setQuestionError: (v: string) => void;
    setShowAddQuestion: (v: boolean) => void;
    questionSuccess: string;
    questionError: string;
    setShowJSONUpload: (v: boolean) => void;    
}

function QuestionTable({ questions, filteredQuestions, questionSearchQuery, setQuestionSearchQuery,
    filterTopic, setFilterTopic, filterDifficulty, setFilterDifficulty, sortField, sortOrder, handleSort,
    handleDeleteQuestion, setEditQuestion, setShowEditQuestion, setQuestionError, setShowAddQuestion,
     questionSuccess, questionError, setShowJSONUpload }: QuestionTableProps) {
    const navigate = useNavigate();
    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3>Question Bank</h3>
            </div>

            {/* Search and Filter Row */}
            <div style={{ display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
                <div style={styles.searchBox}>
                    <span>🔍</span>
                    <input
                        type="text"
                        placeholder="Search by question ID"
                        value={questionSearchQuery}
                        onChange={(e) => setQuestionSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <select
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    style={styles.filterSelect}
                >
                    <option value="all">All Topics</option>
                    {[...new Set(questions.flatMap(q => Array.isArray(q.topic) ? q.topic : [q.topic]))].map(topic => (
                        <option key={topic} value={topic}>{topic}</option>
                    ))}
                </select>
                <select
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    style={styles.filterSelect}
                >
                    <option value="all">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                </select>
                <button
                    onClick={() => { setShowAddQuestion(true); setQuestionError(""); }}
                    style={{ ...styles.addQuestionButton, marginLeft: "auto" }}>
                    + Add Question
                </button>
                <button
                onClick={() => { setShowJSONUpload(true); setQuestionError(""); }}
                    style={{ ...styles.addQuestionButton, marginLeft: "10px" }}>
                    Upload JSON
                </button >
            </div>

            <table style={styles.table}>
                <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                    <tr>
                        <th style={styles.th} onClick={() => handleSort("questionId")}>
                            ID {sortField === "questionId" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </th>
                        <th style={styles.th} onClick={() => handleSort("title")}>
                            Title {sortField === "title" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </th>
                        <th style={styles.th} onClick={() => handleSort("topic")}>
                            Topic {sortField === "topic" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </th>
                        <th style={styles.th} onClick={() => handleSort("difficulty")}>
                            Difficulty {sortField === "difficulty" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </th>
                        <th style={styles.th}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredQuestions.map((q) => (
                        <tr key={q.questionId} style={styles.tr}>
                            <td style={styles.td}>{q.questionId}</td>
                            <td style={styles.td}>{q.title}</td>
                            <td style={styles.td}>{Array.isArray(q.topic) ? q.topic.join(", ") : q.topic}</td>
                            <td style={styles.td}>{q.difficulty}</td>
                            <td style={styles.td}>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        onClick={() => { setEditQuestion({ ...q }); setShowEditQuestion(true); setQuestionError(""); }}
                                        style={styles.promoteButton}>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteQuestion(q.questionId)}
                                        style={{ ...styles.promoteButton, backgroundColor: "red" }}>
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {questionSuccess && <p style={{ color: "green", marginTop: "10px" }}>{questionSuccess}</p>}
            {questionError && <p style={{ color: "red", marginTop: "10px" }}>{questionError}</p>}
        </>
    );
}
const styles = webStyles;

export default QuestionTable;