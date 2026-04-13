import React from "react"
import { useState, useEffect } from "react";
import api from "../api/axiosInstance"
import UserTable from "../components/userTable";
import QuestionTable from "../components/questionTable";
import AddQuestionModal from "../components/addQuestionModal";
import EditQuestionModal from "../components/editQuestionModale";
import styles from "../components/styles";
import FeedbackTable from "../components/feedbackTable";
import { getAllFeedback, updateFeedback, deleteFeedback } from "../api/feedbackService";

function AdminPage() {
    const stored = localStorage.getItem("login");
    const user = stored ? JSON.parse(stored) : null;
    const token = user?.token;
    const [activeTab, setActiveTab] = React.useState("user");
    const [userSuccess, setUserSuccess] = useState("");
    const [userError, setUserError] = useState("");
    const [questionSuccess, setQuestionSuccess] = useState("");
    const [questionError, setQuestionError] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterAdmin, setFilterAdmin] = useState("all");
    const [sortField, setSortField] = useState("username");
    const [sortOrder, setSortOrder] = useState("asc");
    const [questionSearchQuery, setQuestionSearchQuery] = useState("");
    const [filterTopic, setFilterTopic] = useState("all");
    const [questions, setQuestions] = useState<any[]>([]);
    const [filterDifficulty, setFilterDifficulty] = useState("all");
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [feedbackSuccess, setFeedbackSuccess] = useState("");
    const [feedbackError, setFeedbackError] = useState("");
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
    const [showTopicDropdown, setShowTopicDropdown] = useState(false);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

    // ===== FUNCTION DECLARATIONS =====

    const fetchUsers = React.useCallback(async () => {
        try {
            const response = await api.get("http://localhost:3001/users",
                { headers: { Authorization: `Bearer \${token}` } }
            );
            setUsers(response.data.data);
        } catch (error: any) {
            setUserError("Failed to fetch users.");
        }
    }, [token]);

    const fetchQuestions = React.useCallback(async () => {
        try {
            const response = await api.get("http://localhost:3002/questions",
                { headers: { Authorization: `Bearer \${token}` } }
            );
            setQuestions(response.data);
        } catch (error: any) {
            setQuestionError("Failed to fetch questions.");
        }
    }, [token]);

    const fetchFeedback = React.useCallback(async () => {
        try {
            const data = await getAllFeedback();
            setFeedbacks(data);
        } catch (error: any) {
            setFeedbackError("Failed to fetch feedback.");
        }
    }, []);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const handlePromote = React.useCallback(async (userId: string) => {
        const confirmed = window.confirm("Are you sure you want to promote this user to admin?");
        if (!confirmed) return;
        try {
            await api.patch(`[http://localhost:3001/users/](http://localhost:3001/users/)\${userId}/privilege`,
                { isAdmin: true },
                { headers: { Authorization: `Bearer \${token}` } }
            );
            setUserSuccess("User promoted to admin successfully!");
            await fetchUsers();
        } catch (error: any) {
            setUserError("Failed to promote user.");
        }
    }, [token, fetchUsers]);

    const handleDemote = React.useCallback(async (userId: string) => {
        if (userId === user?.id) {
            setUserError("You cannot demote yourself.");
            return;
        }
        const confirmed = window.confirm("Are you sure you want to demote this admin to user?");
        if (!confirmed) return;
        try {
            await api.patch(`[http://localhost:3001/users/](http://localhost:3001/users/)\${userId}/privilege`,
                { isAdmin: false },
                { headers: { Authorization: `Bearer \${token}` } }
            );
            setUserSuccess("User demoted successfully!");
            await fetchUsers();
        } catch (error: any) {
            setUserError("Failed to demote user.");
        }
    }, [token, user?.id, fetchUsers]);

    const handleDeleteQuestion = React.useCallback(async (questionId: string) => {
        const confirmed = window.confirm("Are you sure you want to delete this question?");
        if (!confirmed) return;
        try {
            await api.delete(`[http://localhost:3002/questions/](http://localhost:3002/questions/)\${questionId}`,
                { headers: { Authorization: `Bearer \${token}` } }
            );
            setQuestionSuccess("Question deleted successfully!");
            await fetchQuestions();
        } catch (error: any) {
            setQuestionError("Failed to delete question.");
        }
    }, [token, fetchQuestions]);

    const handleAddQuestion = React.useCallback(async () => {
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
                { headers: { Authorization: `Bearer \${token}` } }
            );
            setQuestionSuccess("Question added successfully!");
            setShowAddQuestion(false);
            setNewQuestion({ questionId: "", title: "", topic: [], difficulty: "", description: "", constraints: [], examples: [], hints: [], testCases: { sample: [], hidden: [] } });
            await fetchQuestions();
            setQuestionError("");
        } catch (error: any) {
            setQuestionError(error.response?.data?.message || "Failed to add question.");
        }
    }, [newQuestion, token, fetchQuestions]);

    const handleEditQuestion = React.useCallback(async () => {
        if (!editQuestion.title || !editQuestion.topic || !editQuestion.difficulty || !editQuestion.description) {
            setQuestionError("Please fill in all required fields.");
            return;
        }
        if (editQuestion.testCases.sample.length === 0) {
            setQuestionError("At least one sample test case is required.");
            return;
        }
        try {
            await api.patch(`[http://localhost:3002/questions/](http://localhost:3002/questions/)\${editQuestion.questionId}`,
                editQuestion,
                { headers: { Authorization: `Bearer \${token}` } }
            );
            setQuestionSuccess("Question updated successfully!");
            setShowEditQuestion(false);
            setEditQuestion(null);
            await fetchQuestions();
        } catch (error: any) {
            setQuestionError(error.response?.data?.message || "Failed to update question.");
        }
    }, [editQuestion, token, fetchQuestions]);

    const handleReviewFeedback = React.useCallback(async (id: string) => {
        try {
            await updateFeedback(id, { status: "reviewed" });
            setFeedbackSuccess("Feedback marked as reviewed.");
            await fetchFeedback();
        } catch (error: any) {
            setFeedbackError("Failed to update feedback.");
        }
    }, [fetchFeedback]);

    const handleResolveFeedback = React.useCallback(async (id: string) => {
        try {
            await updateFeedback(id, { status: "resolved" });
            setFeedbackSuccess("Feedback marked as resolved.");
            await fetchFeedback();
        } catch (error: any) {
            setFeedbackError("Failed to update feedback.");
        }
    }, [fetchFeedback]);

    const handleDeleteFeedback = React.useCallback(async (id: string) => {
        const confirmed = window.confirm("Are you sure you want to delete this feedback?");
        if (!confirmed) return;

        try {
            await deleteFeedback(id);
            setFeedbackSuccess("Feedback deleted successfully.");
            await fetchFeedback();
        } catch (error: any) {
            setFeedbackError("Failed to delete feedback.");
        }
    }, [fetchFeedback]);

    const handleEditQuestionFromFeedback = React.useCallback((feedback: any) => {
        const fullQuestion = questions.find(
            (q) => q.questionId === feedback.questionId
        );

        if (!fullQuestion) {
            setFeedbackError("Could not find the linked question in the question bank.");
            return;
        }
        
        setEditQuestion({ ...fullQuestion });
        setShowEditQuestion(true);
        setQuestionError("");
        setActiveTab("question");
    }, [questions]);

    // ===== USEEFFECT HOOKS =====

    useEffect(() => {
        fetchUsers();
        fetchQuestions();
        fetchFeedback();
    }, [fetchUsers, fetchQuestions, fetchFeedback]);

    useEffect(() => {
        setUserSuccess("");
        setUserError("");
        setQuestionSuccess("");
        setQuestionError("");
        setFeedbackSuccess("");
        setFeedbackError("");
    }, [activeTab]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.topic-dropdown')) {
                setShowTopicDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ===== FILTERED DATA =====

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

    const filteredQuestions = questions
        .filter(q =>
            selectedTopics.length === 0 ||
            (Array.isArray(q.topic)
                ? q.topic.some((t: string) => selectedTopics.includes(t))
                : selectedTopics.includes(q.topic))
        ).filter(q => filterDifficulty === "all" || q.difficulty === filterDifficulty)
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
                <button onClick={() => setActiveTab("feedback")} style={activeTab === "feedback" ? styles.activeTab : styles.tab}>
                    Feedback
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
                />}

                {activeTab === "feedback" && (
                    <FeedbackTable
                        feedbacks={feedbacks}
                        questions={questions}
                        feedbackError={feedbackError}
                        feedbackSuccess={feedbackSuccess}
                        handleResolveFeedback={handleResolveFeedback}
                        handleReviewFeedback={handleReviewFeedback}
                        handleDeleteFeedback={handleDeleteFeedback}
                        handleEditQuestionFromFeedback={handleEditQuestionFromFeedback}
                    />
                )}
            </div>

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
                    onClose={() => setShowAddQuestion(false)}
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
        </div>
    );
}

export default AdminPage;
