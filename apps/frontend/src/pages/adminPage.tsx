import React from "react"
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"

function AdminPage() {
    const stored = localStorage.getItem("login");
    const user = stored ? JSON.parse(stored) : null;
    const token = user?.token;
    const [activeTab, setActiveTab] = React.useState("user");
    const [userSuccess, setUserSuccess] = useState("");
    const [userError, setUserError] = useState("");
    const [questionSuccess, setQuestionSuccess] = useState("");
    const [questionError, setQuestionError] = useState(""); const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterAdmin, setFilterAdmin] = useState("all");
    const [sortField, setSortField] = useState("username");
    const [sortOrder, setSortOrder] = useState("asc");
    const [questionSearchQuery, setQuestionSearchQuery] = useState("");
    const [filterTopic, setFilterTopic] = useState("all");
    const [questions, setQuestions] = useState<any[]>([]);
    const [filterDifficulty, setFilterDifficulty] = useState("all");
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        questionId: "",
        title: "",
        topic: [] as string[],
        difficulty: "",
        description: "",
        constraints: [] as string[],
        examples: [] as { input: any; output: any; explanation?: string }[],
        hints: [] as string[],
        testCases: {
            sample: [] as { input: any; expectedOutput: any }[],
            hidden: [] as { input: any; expectedOutput: any }[]
        }
    });
    const [topicInput, setTopicInput] = useState("");
    const [editTopicInput, setEditTopicInput] = useState("");
    const [constraintInput, setConstraintInput] = useState("");
    const [hintInput, setHintInput] = useState("");
    const [sampleInput, setSampleInput] = useState("");
    const [sampleOutput, setSampleOutput] = useState("");
    const [hiddenInput, setHiddenInput] = useState("");
    const [hiddenOutput, setHiddenOutput] = useState("");
    const [showEditQuestion, setShowEditQuestion] = useState(false);
    const [editQuestion, setEditQuestion] = useState<any>(null);
    const [editConstraintInput, setEditConstraintInput] = useState("");
    const [editHintInput, setEditHintInput] = useState("");
    const [editSampleInput, setEditSampleInput] = useState("");
    const [editSampleOutput, setEditSampleOutput] = useState("");
    const [editHiddenInput, setEditHiddenInput] = useState("");
    const [editHiddenOutput, setEditHiddenOutput] = useState("");

    useEffect(() => {
        fetchUsers();
        fetchQuestions();
    }, []);

    useEffect(() => {
        setUserSuccess("");
        setUserError("");
        setQuestionSuccess("");
        setQuestionError("");
    }, [activeTab]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get("http://localhost:3001/users",
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUsers(response.data.data);
        } catch (error: any) {
            setUserError("Failed to fetch users.");
        }
    };

    const handlePromote = async (userId: string) => {
        const confirmed = window.confirm("Are you sure you want to promote this user to admin?");
        if (!confirmed) return;
        try {
            await api.patch(`http://localhost:3001/users/${userId}/privilege`,
                { isAdmin: true },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUserSuccess("User promoted to admin successfully!");
            fetchUsers();
        } catch (error: any) {
            setUserError("Failed to promote user.");
        }
    };

    const handleDemote = async (userId: string) => {
        if (userId === user?.id) {
            setUserError("You cannot demote yourself.");
            return;
        }
        const confirmed = window.confirm("Are you sure you want to demote this admin to user?");
        if (!confirmed) return;
        try {
            await api.patch(`http://localhost:3001/users/${userId}/privilege`,
                { isAdmin: false },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUserSuccess("User demoted successfully!");
            fetchUsers();
        } catch (error: any) {
            setUserError("Failed to demote user.");
        }
    };

    const filteredUsers = users
        .filter(u => {
            if (filterAdmin === "admin") return u.isAdmin;
            if (filterAdmin === "user") return !u.isAdmin;
            return true;
        })
        .filter(u =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            const valA = a[sortField]?.toLowerCase() ?? "";
            const valB = b[sortField]?.toLowerCase() ?? "";
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    const fetchQuestions = async () => {
        try {
            const response = await api.get("http://localhost:3002/questions",
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setQuestions(response.data);
        } catch (error: any) {
            setQuestionError("Failed to fetch questions.");
        }
    };

    const filteredQuestions = questions
        .filter(q => filterTopic === "all" || (Array.isArray(q.topic) ? q.topic.includes(filterTopic) : q.topic === filterTopic))
        .filter(q => filterDifficulty === "all" || q.difficulty === filterDifficulty)
        .filter(q =>
            q.questionId.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
            q.title.toLowerCase().includes(questionSearchQuery.toLowerCase())
        )
        .sort((a, b) => {
            const valA = a[sortField]?.toLowerCase() ?? "";
            const valB = b[sortField]?.toLowerCase() ?? "";
            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    const handleDeleteQuestion = async (questionId: string) => {
        const confirmed = window.confirm("Are you sure you want to delete this question?");
        if (!confirmed) return;
        try {
            await api.delete(`http://localhost:3002/questions/${questionId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setQuestionSuccess("Question deleted successfully!");
            fetchQuestions();
        } catch (error: any) {
            setQuestionError("Failed to delete question.");
        }
    };

    const handleAddQuestion = async () => {
        if (!newQuestion.questionId || !newQuestion.title || !newQuestion.topic || !newQuestion.difficulty || !newQuestion.description) {
            setQuestionError("Please fill in all required fields.");
            return;
        }
        if (newQuestion.testCases.sample.length === 0) {
            setQuestionError("At least one sample test case is required.");
            return;
        }
        try {
            await api.post("http://localhost:3002/questions",
                newQuestion,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setQuestionSuccess("Question added successfully!");
            setShowAddQuestion(false);
            setNewQuestion({ questionId: "", title: "", topic: [], difficulty: "", description: "", constraints: [], examples: [], hints: [], testCases: { sample: [], hidden: [] } });
            fetchQuestions();
        } catch (error: any) {
            setQuestionError(error.response?.data?.message || "Failed to add question.");
        }
    };

    const handleEditQuestion = async () => {
        if (!editQuestion.title || !editQuestion.topic || !editQuestion.difficulty || !editQuestion.description) {
            setQuestionError("Please fill in all required fields.");
            return;
        }
        if (editQuestion.testCases.sample.length === 0) {
            setQuestionError("At least one sample test case is required.");
            return;
        }
        try {
            await axios.patch(`http://localhost:3002/questions/${editQuestion.questionId}`,
                editQuestion,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setQuestionSuccess("Question updated successfully!");
            setShowEditQuestion(false);
            setEditQuestion(null);
            fetchQuestions();
        } catch (error: any) {
            setQuestionError(error.response?.data?.message || "Failed to update question.");
        }
    };

    return (
        <div style={{ display: "flex", marginTop: "60px", minHeight: "100vh" }}>
            <div style={styles.sidebar}>
                <h3 style={styles.heading}>Admin</h3>
                <button onClick={() => setActiveTab("user")} style={activeTab === "user" ? styles.activeTab : styles.tab}>
                    User Database
                </button>
                <button onClick={() => setActiveTab("question")} style={activeTab === "question" ? styles.activeTab : styles.tab}>
                    Question Bank
                </button>
            </div>
            <div style={{ flex: 1, padding: "40px" }}>
                {activeTab === "user" && (
                    <>
                        <h3 style={{ marginBottom: "20px" }}>User Database</h3>

                        {/* Search and Filter Row */}
                        <div style={{ display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
                            <div style={styles.searchBox}>
                                <span>🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search by username or ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={styles.searchInput}
                                />
                            </div>
                            <select
                                value={filterAdmin}
                                onChange={(e) => setFilterAdmin(e.target.value)}
                                style={styles.filterSelect}
                            >
                                <option value="all">All Accounts</option>
                                <option value="user">Users</option>
                                <option value="admin">Admins</option>
                            </select>
                        </div>

                        <table style={styles.table}>
                            <colgroup>
                                <col style={{ width: "25%" }} />  {/* User ID */}
                                <col style={{ width: "15%" }} />  {/* Username */}
                                <col style={{ width: "25%" }} />  {/* Email */}
                                <col style={{ width: "10%" }} />  {/* Role */}
                                <col style={{ width: "25%" }} />  {/* Action */}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={styles.th} onClick={() => handleSort("id")}>
                                        User ID {sortField === "id" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                                    </th>
                                    <th style={styles.th} onClick={() => handleSort("username")}>
                                        Username {sortField === "username" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                                    </th>
                                    <th style={styles.th} onClick={() => handleSort("email")}>
                                        Email {sortField === "email" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                                    </th>
                                    <th style={styles.th}>Role</th>
                                    <th style={styles.th}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} style={styles.tr}>
                                        <td style={styles.td}>{u.id}</td>
                                        <td style={{ ...styles.td, fontWeight: "bold" }}>{u.username}</td>
                                        <td style={styles.td}>{u.email}</td>
                                        <td style={styles.td}>{u.isAdmin ? "Admin" : "User"}</td>
                                        <td style={styles.td}>
                                            {!u.isAdmin && (
                                                <button
                                                    onClick={() => handlePromote(u.id)}
                                                    style={styles.promoteButton}
                                                >
                                                    Promote to Admin
                                                </button>
                                            )}
                                            {u.isAdmin && u.id !== user?.id && (
                                                <button
                                                    onClick={() => handleDemote(u.id)}
                                                    style={{ ...styles.promoteButton, backgroundColor: "red" }}
                                                >
                                                    Demote to User
                                                </button>
                                            )}
                                            {u.isAdmin && u.id === user?.id && (
                                                <span style={{ color: "#000000", fontSize: "13px", fontWeight: "Bold" }}>You</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {userSuccess && <p style={{ color: "green", marginTop: "10px" }}>{userSuccess}</p>}
                        {userError && <p style={{ color: "red", marginTop: "10px" }}>{userError}</p>}
                    </>
                )}

                {activeTab === "question" && (
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
                )
                }
            </div >
            {showAddQuestion && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalBox}>
                        <h3 style={{ marginBottom: "20px" }}>Add New Question</h3>

                        <label style={styles.modalLabel}>
                            Question ID:
                            <input type="text" value={newQuestion.questionId}
                                onChange={(e) => setNewQuestion({ ...newQuestion, questionId: e.target.value })}
                                style={styles.modalInput} />
                        </label>

                        <label style={styles.modalLabel}>
                            Title:
                            <input type="text" value={newQuestion.title}
                                onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                                style={styles.modalInput} />
                        </label>

                        <label style={styles.modalLabel}>
                            Topics:
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input type="text" value={topicInput}
                                    onChange={(e) => setTopicInput(e.target.value)}
                                    style={{ ...styles.modalInput, flex: 1 }}
                                    placeholder="Add a topic" />
                                <button onClick={() => {
                                    if (topicInput) {
                                        setNewQuestion({ ...newQuestion, topic: [...newQuestion.topic, topicInput] });
                                        setTopicInput("");
                                    }
                                }} style={styles.promoteButton}>Add</button>
                            </div>
                            {newQuestion.topic.map((t, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                    <span>{t}</span>
                                    <button onClick={() => setNewQuestion({ ...newQuestion, topic: newQuestion.topic.filter((_, idx) => idx !== i) })}
                                        style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                                </div>
                            ))}
                        </label>
                        <label style={styles.modalLabel}>
                            Difficulty:
                            <select value={newQuestion.difficulty}
                                onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                                style={styles.modalInput}>
                                <option value="">Select...</option>
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </label>

                        <label style={styles.modalLabel}>
                            Description:
                            <textarea value={newQuestion.description}
                                onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                                style={{ ...styles.modalInput, height: "100px", resize: "vertical" as const }} />
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
                            <button onClick={handleAddQuestion} style={styles.promoteButton}>Submit</button>
                            <button onClick={() => {
                                setShowAddQuestion(false);
                                setNewQuestion({ questionId: "", title: "", topic: [], difficulty: "", description: "", constraints: [], examples: [], hints: [], testCases: { sample: [], hidden: [] } });
                            }} style={{ ...styles.promoteButton, backgroundColor: "gray" }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showEditQuestion && editQuestion && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalBox}>
                        <h3 style={{ marginBottom: "20px" }}>Edit Question</h3>

                        <label style={styles.modalLabel}>
                            Question ID:
                            <input type="text" value={editQuestion.questionId}
                                disabled
                                style={{ ...styles.modalInput, backgroundColor: "#f5f5f5", cursor: "not-allowed" }} />
                        </label>

                        <label style={styles.modalLabel}>
                            Title:
                            <input type="text" value={editQuestion.title}
                                onChange={(e) => setEditQuestion({ ...editQuestion, title: e.target.value })}
                                style={styles.modalInput} />
                        </label>

                        <label style={styles.modalLabel}>
                            Topics:
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input type="text" value={editTopicInput}
                                    onChange={(e) => setEditTopicInput(e.target.value)}
                                    style={{ ...styles.modalInput, flex: 1 }}
                                    placeholder="Add a topic" />
                                <button onClick={() => {
                                    if (editTopicInput) {
                                        setEditQuestion({
                                            ...editQuestion,
                                            topic: [...(Array.isArray(editQuestion.topic) ? editQuestion.topic : [editQuestion.topic]), editTopicInput]
                                        });
                                        setEditTopicInput("");
                                    }
                                }} style={styles.promoteButton}>Add</button>
                            </div>
                            {(Array.isArray(editQuestion.topic) ? editQuestion.topic : [editQuestion.topic]).map((t: string, i: number) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                    <span>{t}</span>
                                    <button onClick={() => setEditQuestion({
                                        ...editQuestion,
                                        topic: (Array.isArray(editQuestion.topic) ? editQuestion.topic : [editQuestion.topic]).filter((_: any, idx: number) => idx !== i)
                                    })}
                                        style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
                                </div>
                            ))}
                        </label>

                        <label style={styles.modalLabel}>
                            Difficulty:
                            <select value={editQuestion.difficulty}
                                onChange={(e) => setEditQuestion({ ...editQuestion, difficulty: e.target.value })}
                                style={styles.modalInput}>
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </label>

                        <label style={styles.modalLabel}>
                            Description:
                            <textarea value={editQuestion.description}
                                onChange={(e) => setEditQuestion({ ...editQuestion, description: e.target.value })}
                                style={{ ...styles.modalInput, height: "100px", resize: "vertical" as const }} />
                        </label>

                        {/* Constraints */}
                        <label style={styles.modalLabel}>
                            Constraints:
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input type="text" value={editConstraintInput}
                                    onChange={(e) => setEditConstraintInput(e.target.value)}
                                    style={{ ...styles.modalInput, flex: 1 }}
                                    placeholder="Add a constraint" />
                                <button onClick={() => {
                                    if (editConstraintInput) {
                                        setEditQuestion({ ...editQuestion, constraints: [...(editQuestion.constraints || []), editConstraintInput] });
                                        setEditConstraintInput("");
                                    }
                                }} style={styles.promoteButton}>Add</button>
                            </div>
                            {(editQuestion.constraints || []).map((c: string, i: number) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
                                    <span>{c}</span>
                                    <button onClick={() => setEditQuestion({ ...editQuestion, constraints: editQuestion.constraints.filter((_: any, idx: number) => idx !== i) })}
                                        style={{ ...styles.promoteButton, backgroundColor: "red", padding: "2px 8px" }}>x</button>
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
                            <button onClick={handleEditQuestion} style={styles.promoteButton}>Save</button>
                            <button onClick={() => {
                                setShowEditQuestion(false);
                                setEditQuestion(null);
                                setQuestionError("");
                            }} style={{ ...styles.promoteButton, backgroundColor: "gray" }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    heading: {
        fontSize: "20px",
        color: "#333",
        textAlign: "left",
        padding: 0,
        margin: "20px 0 20px 20px"
    },
    sidebar: {
        width: "200px",
        minHeight: "100vh",
        borderRight: "1px solid #000000",
        textAlign: "left" as const,
        left: 0,
        padding: 0,
    },
    tab: {
        display: "block",
        width: "100%",
        padding: "15px 20px",
        textAlign: "left",
        border: "none",
        backgroundColor: "transparent",
        cursor: "pointer",
        fontSize: "15px",
    },
    activeTab: {
        display: "block",
        width: "100%",
        padding: "15px 20px",
        textAlign: "left",
        border: "none",
        cursor: "pointer",
        fontSize: "15px",
        backgroundColor: "#ffffff",
        fontWeight: "bold",
    },
    searchBox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        border: "1px solid #ccc",
        borderRadius: "20px",
        padding: "8px 16px",
        backgroundColor: "white",
        width: "300px",
    },
    searchInput: {
        border: "none",
        outline: "none",
        fontSize: "14px",
        width: "100%",
    },
    filterSelect: {
        padding: "8px 16px",
        borderRadius: "20px",
        border: "1px solid #ccc",
        fontSize: "14px",
        cursor: "pointer",
        backgroundColor: "white",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: "white",
        borderRadius: "8px",
        overflow: "hidden",
        tableLayout: "fixed",

    },
    th: {
        textAlign: "left",
        padding: "12px 16px",
        borderBottom: "2px solid #ddd",
        fontSize: "14px",
        color: "#666",
        whiteSpace: "nowrap",
        cursor: "pointer",
    },
    tr: {
        borderBottom: "1px solid #eee",
    },
    td: {
        padding: "12px 16px",
        fontSize: "14px",
        textAlign: "left",
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
    addQuestionButton: {
        padding: "10px 20px",
        backgroundColor: "white",
        border: "2px solid #333",
        borderRadius: "20px",
        fontWeight: "bold" as const,
        fontSize: "15px",
        cursor: "pointer",
    },

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
};

export default AdminPage;