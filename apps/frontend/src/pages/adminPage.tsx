import React from "react"
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"

function AdminPage() {
    const stored = localStorage.getItem("login");
    const user = stored ? JSON.parse(stored) : null;
    const token = user?.token;
    const [activeTab, setActiveTab] = React.useState("user");
    const navigate = useNavigate();
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
        topic: "",
        difficulty: "",
        description: "",
    });

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
        .filter(q => filterTopic === "all" || q.topic === filterTopic)
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
        try {
            await api.post("http://localhost:3002/questions",
                newQuestion,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setQuestionSuccess("Question added successfully!");
            setShowAddQuestion(false);
            setNewQuestion({ questionId: "", title: "", topic: "", difficulty: "", description: "" });
            fetchQuestions();
        } catch (error: any) {
            setQuestionError(error.response?.data?.message || "Failed to add question.");
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
                                        <td style={{ ...styles.td, fontWeight: "bold", cursor: "pointer", color: "#007BFF" }}
                                            onClick={() => navigate(`/admin/users/${u.id}`)}>
                                            {u.id}
                                        </td>
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
                            </select>
                            <button
                                onClick={() => setShowAddQuestion(true)}
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
                                        <td style={{ ...styles.td, cursor: "pointer", color: "#007BFF" }}
                                            onClick={() => navigate(`/admin/questions/${q.questionId}`)}>
                                            {q.questionId}
                                        </td>
                                        <td style={styles.td}>{q.title}</td>
                                        <td style={styles.td}>{q.topic}</td>
                                        <td style={styles.td}>{q.difficulty}</td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.questionId)}
                                                style={{ ...styles.promoteButton, backgroundColor: "red" }}>
                                                Delete
                                            </button>
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
                            Topic:
                            <input type="text" value={newQuestion.topic}
                                onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                                style={styles.modalInput} />
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
                                style={{ ...styles.modalInput, height: "100px", resize: "vertical" }} />
                        </label>
                        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                            <button onClick={handleAddQuestion} style={styles.promoteButton}>Submit</button>
                            <button onClick={() => setShowAddQuestion(false)}
                                style={{ ...styles.promoteButton, backgroundColor: "gray" }}>
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