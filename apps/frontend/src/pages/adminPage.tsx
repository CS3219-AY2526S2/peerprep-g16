import React from "react"
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"
import UserTable from "../components/userTable";
import QuestionTable from "../components/questionTable";
import AddQuestionModal from "../components/addQuestionModal";
import EditQuestionModal from "../components/editQuestionModale";


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
            setQuestionError("");
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
            await api.patch(`http://localhost:3002/questions/${editQuestion.questionId}`,
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
                {activeTab === "user" && <UserTable
                    users={users}
                    filteredUsers={filteredUsers}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterAdmin={filterAdmin}
                    setFilterAdmin={setFilterAdmin}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    handleSort={handleSort}
                    handlePromote={handlePromote}
                    handleDemote={handleDemote}
                    currentUserId={user?.id}
                    userSuccess={userSuccess}
                    userError={userError}
                />}

                {activeTab === "question" && <QuestionTable
                    questions={questions}
                    filteredQuestions={filteredQuestions}
                    questionSearchQuery={questionSearchQuery}
                    setQuestionSearchQuery={setQuestionSearchQuery}
                    filterTopic={filterTopic}
                    setFilterTopic={setFilterTopic}
                    filterDifficulty={filterDifficulty}
                    setFilterDifficulty={setFilterDifficulty}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    handleSort={handleSort}
                    handleDeleteQuestion={handleDeleteQuestion}
                    setEditQuestion={setEditQuestion}
                    setShowEditQuestion={setShowEditQuestion}
                    setQuestionError={setQuestionError}
                    setShowAddQuestion={setShowAddQuestion}
                    questionSuccess={questionSuccess}
                    questionError={questionError}
                />
                }
            </div >
            {showAddQuestion &&
                <AddQuestionModal
                    show={showAddQuestion}
                    newQuestion={newQuestion}
                    setNewQuestion={setNewQuestion}
                    topicInput={topicInput}
                    setTopicInput={setTopicInput}
                    constraintInput={constraintInput}
                    setConstraintInput={setConstraintInput}
                    hintInput={hintInput}
                    setHintInput={setHintInput}
                    sampleInput={sampleInput}
                    setSampleInput={setSampleInput}
                    sampleOutput={sampleOutput}
                    setSampleOutput={setSampleOutput}
                    hiddenInput={hiddenInput}
                    setHiddenInput={setHiddenInput}
                    hiddenOutput={hiddenOutput}
                    setHiddenOutput={setHiddenOutput}
                    handleAddQuestion={handleAddQuestion}
                    questionError={questionError}
                    onClose={() => setShowAddQuestion(false)
                    }
                />
            }
            {showEditQuestion && editQuestion &&
                <EditQuestionModal
                    show={showEditQuestion}
                    editQuestion={editQuestion}
                    setEditQuestion={setEditQuestion}
                    setEditTopicInput={setEditTopicInput}
                    editTopicInput={editTopicInput}
                    editConstraintInput={editConstraintInput}
                    setEditConstraintInput={setEditConstraintInput}
                    editHintInput={editHintInput}
                    setEditHintInput={setEditHintInput}
                    editSampleInput={editSampleInput}
                    setEditSampleInput={setEditSampleInput}
                    editSampleOutput={editSampleOutput}
                    setEditSampleOutput={setEditSampleOutput}
                    editHiddenInput={editHiddenInput}
                    setEditHiddenInput={setEditHiddenInput}
                    editHiddenOutput={editHiddenOutput}
                    setEditHiddenOutput={setEditHiddenOutput}
                    handleEditQuestion={handleEditQuestion}
                    questionError={questionError}
                    onClose={() => {
                        setShowEditQuestion(false);
                        setEditQuestion(null);
                        setQuestionError("");
                    }}
                />
            }
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