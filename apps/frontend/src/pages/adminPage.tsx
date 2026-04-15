import React from "react";
import { useState, useEffect, useCallback } from "react";
import api from "../api/axiosInstance";
import UserTable from "../components/userTable";
import QuestionTable from "../components/questionTable";
import AddQuestionModal from "../components/addQuestionModal";
import EditQuestionModal from "../components/editQuestionModal";
import styles from "../components/styles";
import FeedbackTable from "../components/feedbackTable";
import { getAllFeedback } from "../api/feedbackService";
import UploadJSONFile from "../components/uploadJSONFile";

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL as string;
const QUESTION_SERVICE_URL = import.meta.env
  .VITE_QUESTION_SERVICE_URL as string;

interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface Question {
  questionId: string;
  title: string;
  topic: string[];
  difficulty: string;
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  hints: string[];
  testCases: {
    sample: TestCase[];
    hidden: TestCase[];
  };
  modelAnswer: string;
  modelAnswerTimeComplexity: string;
  modelAnswerExplanation: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

function AdminPage() {
  const stored = localStorage.getItem("login");
  const user = stored ? JSON.parse(stored) : null;
  const token = user?.token;
  const [activeTab, setActiveTab] = React.useState("user");
  const [userSuccess, setUserSuccess] = useState("");
  const [userError, setUserError] = useState("");
  const [questionSuccess, setQuestionSuccess] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [userSortField, setUserSortField] = useState("username");
  const [userSortOrder, setUserSortOrder] = useState("asc");
  const [questionSortField, setQuestionSortField] = useState("questionId");
  const [questionSortOrder, setQuestionSortOrder] = useState("asc");
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  const [filterTopic, setFilterTopic] = useState("all");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [showJSONUpload, setShowJSONUpload] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Question>({
    questionId: "",
    title: "",
    topic: [],
    difficulty: "",
    description: "",
    constraints: [],
    examples: [],
    hints: [],
    testCases: { sample: [], hidden: [] },
    modelAnswer: "",
    modelAnswerTimeComplexity: "",
    modelAnswerExplanation: "",
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
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [editConstraintInput, setEditConstraintInput] = useState("");
  const [editHintInput, setEditHintInput] = useState("");
  const [editSampleInput, setEditSampleInput] = useState("");
  const [editSampleOutput, setEditSampleOutput] = useState("");
  const [editHiddenInput, setEditHiddenInput] = useState("");
  const [editHiddenOutput, setEditHiddenOutput] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get(`${USER_SERVICE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.data);
    } catch {
      setUserError("Failed to fetch users.");
    }
  }, [token]);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await api.get(`${QUESTION_SERVICE_URL}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(response.data);
    } catch {
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

  const handleReviewFeedback = React.useCallback(
    async (id: string) => {
      try {
        await api.patch(
          `${QUESTION_SERVICE_URL}/feedback/${id}`,
          { status: "reviewed" },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setFeedbackSuccess("Feedback marked as reviewed.");
        await fetchFeedback();
      } catch (error: any) {
        setFeedbackError("Failed to update feedback.");
      }
    },
    [fetchFeedback, token],
  );

  const handleResolveFeedback = React.useCallback(
    async (id: string) => {
      try {
        await api.patch(
          `${QUESTION_SERVICE_URL}/feedback/${id}`,
          { status: "resolved" },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setFeedbackSuccess("Feedback marked as resolved.");
        await fetchFeedback();
      } catch (error: any) {
        setFeedbackError("Failed to update feedback.");
      }
    },
    [fetchFeedback, token],
  );

  const handleDeleteFeedback = React.useCallback(
    async (id: string) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this feedback?",
      );
      if (!confirmed) return;

      try {
        await api.delete(`${QUESTION_SERVICE_URL}/feedback/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFeedbackSuccess("Feedback deleted successfully.");
        await fetchFeedback();
      } catch (error: any) {
        setFeedbackError("Failed to delete feedback.");
      }
    },
    [fetchFeedback, token],
  );

  const handleEditQuestionFromFeedback = React.useCallback(
    (feedback: any) => {
      const fullQuestion = questions.find(
        (q) => q.questionId === feedback.questionId,
      );

      if (!fullQuestion) {
        setFeedbackError(
          "Could not find the linked question in the question bank.",
        );
        return;
      }

      setEditQuestion({ ...fullQuestion });
      setShowEditQuestion(true);
      setQuestionError("");
      setActiveTab("question");
    },
    [questions],
  );

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

  const handleUserSort = (field: string) => {
    if (userSortField === field) {
      setUserSortOrder(userSortOrder === "asc" ? "desc" : "asc");
    } else {
      setUserSortField(field);
      setUserSortOrder("asc");
    }
  };

  const handleQuestionSort = (field: string) => {
    if (questionSortField === field) {
      setQuestionSortOrder(questionSortOrder === "asc" ? "desc" : "asc");
    } else {
      setQuestionSortField(field);
      setQuestionSortOrder("asc");
    }
  };

  const handlePromote = async (userId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to promote this user to admin?",
    );
    if (!confirmed) return;
    try {
      await api.patch(
        `${USER_SERVICE_URL}/users/${userId}/privilege`,
        { isAdmin: true },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUserSuccess("User promoted to admin successfully!");
      fetchUsers();
    } catch {
      setUserError("Failed to promote user.");
    }
  };

  const handleDemote = async (userId: string) => {
    if (userId === user?.id) {
      setUserError("You cannot demote yourself.");
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to demote this admin to user?",
    );
    if (!confirmed) return;
    try {
      await api.patch(
        `${USER_SERVICE_URL}/users/${userId}/privilege`,
        { isAdmin: false },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUserSuccess("User demoted successfully!");
      fetchUsers();
    } catch {
      setUserError("Failed to demote user.");
    }
  };

  // ===== FILTERED DATA =====
  const filteredUsers = users
    .filter((u) => {
      if (filterAdmin === "admin") return u.isAdmin;
      if (filterAdmin === "user") return !u.isAdmin;
      return true;
    })
    .filter(
      (u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const key = userSortField as keyof User;
      const valA = String(a[key] ?? "").toLowerCase();
      const valB = String(b[key] ?? "").toLowerCase();
      if (valA < valB) return userSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return userSortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const filteredQuestions = questions
    .filter((q) => {
      const topics = Array.isArray(q.topic) ? q.topic : [q.topic];
      return filterTopic === "all" || topics.includes(filterTopic);
    })
    .filter(
      (q) => filterDifficulty === "all" || q.difficulty === filterDifficulty,
    )
    .filter(
      (q) =>
        q.questionId
          .toLowerCase()
          .includes(questionSearchQuery.toLowerCase()) ||
        q.title.toLowerCase().includes(questionSearchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const key = questionSortField as keyof Question;
      const valA = String(a[key] ?? "").toLowerCase();
      const valB = String(b[key] ?? "").toLowerCase();
      if (valA < valB) return questionSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return questionSortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const handleDeleteQuestion = async (questionId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this question?",
    );
    if (!confirmed) return;
    try {
      await api.delete(`${QUESTION_SERVICE_URL}/questions/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestionSuccess("Question deleted successfully!");
      fetchQuestions();
    } catch {
      setQuestionError("Failed to delete question.");
    }
  };

  const handleAddQuestion = async () => {
    if (
      !newQuestion.questionId ||
      !newQuestion.title ||
      newQuestion.topic.length === 0 ||
      !newQuestion.difficulty ||
      !newQuestion.description
    ) {
      setQuestionError("Please fill in all required fields.");
      return;
    }
    if (newQuestion.testCases.sample.length === 0) {
      setQuestionError("At least one sample test case is required.");
      return;
    }
    try {
      await api.post(`${QUESTION_SERVICE_URL}/questions`, newQuestion, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestionSuccess("Question added successfully!");
      setShowAddQuestion(false);
      setNewQuestion({
        questionId: "",
        title: "",
        topic: [],
        difficulty: "",
        description: "",
        constraints: [],
        examples: [],
        hints: [],
        testCases: { sample: [], hidden: [] },
        modelAnswer: "",
        modelAnswerTimeComplexity: "",
        modelAnswerExplanation: "",
      });
      fetchQuestions();
      setQuestionError("");
    } catch (err) {
      const error = err as ApiError;
      const messages = error.response?.data?.message;
      const detail = Array.isArray(messages)
        ? messages.join("\n")
        : (messages ?? "Failed to add question.");
      setQuestionError(detail);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const questionsToUpload = Array.isArray(parsed) ? parsed : [parsed];

      let successCount = 0;
      const failedQuestions: string[] = [];

      for (const q of questionsToUpload) {
        try {
          await api.post(`${QUESTION_SERVICE_URL}/questions`, q, {
            headers: { Authorization: `Bearer ${token}` },
          });
          successCount++;
        } catch (err) {
          const error = err as ApiError;
          const label = q.title
            ? `"${q.title}" (${q.questionId})`
            : (q.questionId ?? "Unknown");
          const messages = error.response?.data?.message;
          const detail = Array.isArray(messages)
            ? messages.join(", ")
            : (messages ?? "Unknown error");
          failedQuestions.push(`${label}: ${detail}`);
        }
      }

      if (failedQuestions.length === 0) {
        setQuestionSuccess(
          `Uploaded ${successCount} question(s) successfully!`,
        );
        setQuestionError("");
      } else if (successCount === 0) {
        setQuestionError(
          `All questions failed to upload:\n${failedQuestions.join("\n")}`,
        );
        setQuestionSuccess("");
      } else {
        setQuestionError(
          `${successCount} uploaded, ${failedQuestions.length} failed:\n${failedQuestions.join("\n")}`,
        );
        setQuestionSuccess("");
      }

      fetchQuestions();
    } catch {
      setQuestionError("Invalid file format. Please upload a valid JSON file.");
      setQuestionSuccess("");
    }

    e.target.value = "";
  };

  const handleEditQuestion = async () => {
    if (!editQuestion) return;
    if (
      !editQuestion.title ||
      editQuestion.topic.length === 0 ||
      !editQuestion.difficulty ||
      !editQuestion.description
    ) {
      setQuestionError("Please fill in all required fields.");
      return;
    }
    if (editQuestion.testCases.sample.length === 0) {
      setQuestionError("At least one sample test case is required.");
      return;
    }
    try {
      await api.patch(
        `${QUESTION_SERVICE_URL}/questions/${editQuestion.questionId}`,
        editQuestion,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setQuestionSuccess("Question updated successfully!");
      setShowEditQuestion(false);
      setEditQuestion(null);
      fetchQuestions();
    } catch (err) {
      const error = err as ApiError;
      const messages = error.response?.data?.message;
      const detail = Array.isArray(messages)
        ? messages.join("\n")
        : (messages ?? "Failed to update question.");
      setQuestionError(detail);
    }
  };

  return (
    <div style={{ display: "flex", marginTop: "60px", minHeight: "100vh" }}>
      <div style={styles.sidebar}>
        <h3 style={styles.heading}>Admin</h3>
        <button
          onClick={() => {
            setActiveTab("user");
            setUserSuccess("");
            setUserError("");
            setQuestionSuccess("");
            setQuestionError("");
          }}
          style={activeTab === "user" ? styles.activeTab : styles.tab}
        >
          User Database
        </button>
        <button
          onClick={() => {
            setActiveTab("question");
            setUserSuccess("");
            setUserError("");
            setQuestionSuccess("");
            setQuestionError("");
          }}
          style={activeTab === "question" ? styles.activeTab : styles.tab}
        >
          Question Bank
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          style={activeTab === "feedback" ? styles.activeTab : styles.tab}
        >
          Feedback
        </button>
      </div>
      <div style={{ flex: 1, padding: "40px" }}>
        {activeTab === "user" && (
          <UserTable
            users={users}
            filteredUsers={filteredUsers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterAdmin={filterAdmin}
            setFilterAdmin={setFilterAdmin}
            sortField={userSortField}
            sortOrder={userSortOrder}
            handleSort={handleUserSort}
            handlePromote={handlePromote}
            handleDemote={handleDemote}
            currentUserId={user?.id}
            userSuccess={userSuccess}
            userError={userError}
          />
        )}

        {activeTab === "question" && (
          <QuestionTable
            questions={questions}
            filteredQuestions={filteredQuestions}
            questionSearchQuery={questionSearchQuery}
            setQuestionSearchQuery={setQuestionSearchQuery}
            filterTopic={filterTopic}
            setFilterTopic={setFilterTopic}
            filterDifficulty={filterDifficulty}
            setFilterDifficulty={setFilterDifficulty}
            sortField={questionSortField}
            sortOrder={questionSortOrder}
            handleSort={handleQuestionSort}
            handleDeleteQuestion={handleDeleteQuestion}
            setEditQuestion={setEditQuestion}
            setShowEditQuestion={setShowEditQuestion}
            setQuestionError={setQuestionError}
            setShowAddQuestion={setShowAddQuestion}
            questionSuccess={questionSuccess}
            questionError={questionError}
            setShowJSONUpload={setShowJSONUpload}
          />
        )}
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

      {showAddQuestion && (
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
      )}
      {showJSONUpload && (
        <UploadJSONFile
          show={showJSONUpload}
          onClose={() => {
            setShowJSONUpload(false);
            setQuestionError("");
            setQuestionSuccess("");
          }}
          onUpload={handleFileUpload}
          questionError={questionError}
          questionSuccess={questionSuccess}
        />
      )}
      {showEditQuestion && editQuestion && (
        <EditQuestionModal
          show={showEditQuestion}
          editQuestion={editQuestion}
          setEditQuestion={(q) => setEditQuestion(q as Question | null)}
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
      )}
    </div>
  );
}

export default AdminPage;
