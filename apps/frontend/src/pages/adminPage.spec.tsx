import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminPage from "./adminPage";


interface MockUser {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
}

interface MockQuestion {
    questionId: string;
    title: string;
    topic: string[];
    difficulty: string;
    description: string;
    constraints: string[];
    examples: { input: string; output: string; explanation?: string }[];
    hints: string[];
    testCases: { sample: { input: string; expectedOutput: string }[]; hidden: { input: string; expectedOutput: string }[] };
    modelAnswer: string;
    modelAnswerTimeComplexity: string;
    modelAnswerExplanation: string;
}

interface UserTableProps {
    filteredUsers: MockUser[];
    handlePromote: (id: string) => void;
    handleDemote: (id: string) => void;
    userSuccess: string;
    userError: string;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    filterAdmin: string;
    setFilterAdmin: (v: string) => void;
    // other props passed through but not used in stub
    users: MockUser[];
    sortField: string;
    sortOrder: string;
    handleSort: (field: string) => void;
    currentUserId: string;
}

interface QuestionTableProps {
    filteredQuestions: MockQuestion[];
    handleDeleteQuestion: (id: string) => void;
    setShowAddQuestion: (v: boolean) => void;
    setShowJSONUpload: (v: boolean) => void;
    questionSuccess: string;
    questionError: string;
    questionSearchQuery: string;
    setQuestionSearchQuery: (v: string) => void;
    // other props passed through but not used in stub
    questions: MockQuestion[];
    filterTopic: string;
    setFilterTopic: (v: string) => void;
    filterDifficulty: string;
    setFilterDifficulty: (v: string) => void;
    sortField: string;
    sortOrder: string;
    handleSort: (field: string) => void;
    setEditQuestion: (q: MockQuestion | null) => void;
    setShowEditQuestion: (v: boolean) => void;
    setQuestionError: (v: string) => void;
}

interface ModalBaseProps {
    show: boolean;
    onClose: () => void;
    questionError: string;
}

interface AddQuestionModalProps extends ModalBaseProps {
    handleAddQuestion: () => void;
}

interface EditQuestionModalProps extends ModalBaseProps {
    handleEditQuestion: () => void;
}

interface UploadJSONFileProps extends ModalBaseProps {
    questionSuccess: string;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}


vi.mock("../components/userTable", () => ({
    default: ({ filteredUsers, handlePromote, handleDemote, userSuccess, userError, searchQuery, setSearchQuery, filterAdmin, setFilterAdmin }: UserTableProps) => (
        <div data-testid="user-table">
            <input
                data-testid="user-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
                data-testid="filter-admin"
                value={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.value)}
            >
                <option value="all">All</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
            </select>
            {userSuccess && <div data-testid="user-success">{userSuccess}</div>}
            {userError && <div data-testid="user-error">{userError}</div>}
            {filteredUsers.map((u: MockUser) => (
                <div key={u.id} data-testid={`user-row-${u.id}`}>
                    <span>{u.username}</span>
                    <button onClick={() => handlePromote(u.id)}>Promote</button>
                    <button onClick={() => handleDemote(u.id)}>Demote</button>
                </div>
            ))}
        </div>
    ),
}));

vi.mock("../components/questionTable", () => ({
    default: ({ filteredQuestions, handleDeleteQuestion, setShowAddQuestion, setShowJSONUpload, questionSuccess, questionError, questionSearchQuery, setQuestionSearchQuery }: QuestionTableProps) => (
        <div data-testid="question-table">
            <input
                data-testid="question-search"
                value={questionSearchQuery}
                onChange={(e) => setQuestionSearchQuery(e.target.value)}
            />
            {questionSuccess && <div data-testid="question-success">{questionSuccess}</div>}
            {questionError && <div data-testid="question-error">{questionError}</div>}
            <button data-testid="add-question-btn" onClick={() => setShowAddQuestion(true)}>Add Question</button>
            <button data-testid="upload-json-btn" onClick={() => setShowJSONUpload(true)}>Upload JSON</button>
            {filteredQuestions.map((q: MockQuestion) => (
                <div key={q.questionId} data-testid={`question-row-${q.questionId}`}>
                    <span>{q.title}</span>
                    <button onClick={() => handleDeleteQuestion(q.questionId)}>Delete</button>
                </div>
            ))}
        </div>
    ),
}));

vi.mock("../components/addQuestionModal", () => ({
    default: ({ show, onClose, handleAddQuestion, questionError }: AddQuestionModalProps) =>
        show ? (
            <div data-testid="add-question-modal">
                {questionError && <div data-testid="add-question-error">{questionError}</div>}
                <button data-testid="submit-add-question" onClick={handleAddQuestion}>Submit</button>
                <button data-testid="close-add-modal" onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

vi.mock("../components/editQuestionModal", () => ({
    default: ({ show, onClose, handleEditQuestion, questionError }: EditQuestionModalProps) =>
        show ? (
            <div data-testid="edit-question-modal">
                {questionError && <div data-testid="edit-question-error">{questionError}</div>}
                <button data-testid="submit-edit-question" onClick={handleEditQuestion}>Update</button>
                <button data-testid="close-edit-modal" onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

vi.mock("../components/uploadJSONFile", () => ({
    default: ({ show, onClose, questionError, questionSuccess }: UploadJSONFileProps) =>
        show ? (
            <div data-testid="upload-json-modal">
                {questionError && <div data-testid="upload-error">{questionError}</div>}
                {questionSuccess && <div data-testid="upload-success">{questionSuccess}</div>}
                <button data-testid="close-upload-modal" onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

vi.mock("../components/styles", () => ({
    default: {
        sidebar: {},
        heading: {},
        activeTab: {},
        tab: {},
    },
}));

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("../api/axiosInstance", () => ({
    default: {
        get: (...args: unknown[]) => mockGet(...args),
        post: (...args: unknown[]) => mockPost(...args),
        patch: (...args: unknown[]) => mockPatch(...args),
        delete: (...args: unknown[]) => mockDelete(...args),
    },
}));

vi.stubEnv("VITE_USER_SERVICE_URL", "http://user-service");
vi.stubEnv("VITE_QUESTION_SERVICE_URL", "http://question-service");

const mockUsers = [
    { id: "u1", username: "alice", email: "alice@example.com", isAdmin: false },
    { id: "u2", username: "bob", email: "bob@example.com", isAdmin: true },
    { id: "u3", username: "carol", email: "carol@example.com", isAdmin: false },
];

const mockQuestions = [
    {
        questionId: "q1",
        title: "Two Sum",
        topic: ["Array", "Hash Table"],
        difficulty: "Easy",
        description: "Find two numbers that add up to target.",
        constraints: [],
        examples: [],
        hints: [],
        testCases: { sample: [{ input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" }], hidden: [] },
        modelAnswer: "",
        modelAnswerTimeComplexity: "",
        modelAnswerExplanation: "",
    },
    {
        questionId: "q2",
        title: "Merge Sort",
        topic: ["Sorting"],
        difficulty: "Medium",
        description: "Sort an array using merge sort.",
        constraints: [],
        examples: [],
        hints: [],
        testCases: { sample: [{ input: "[3,1,2]", expectedOutput: "[1,2,3]" }], hidden: [] },
        modelAnswer: "",
        modelAnswerTimeComplexity: "",
        modelAnswerExplanation: "",
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupLocalStorage = (overrides = {}) => {
    const user = { id: "u2", token: "test-token", ...overrides };
    localStorage.setItem("login", JSON.stringify(user));
    return user;
};

const setupSuccessfulFetches = () => {
    mockGet.mockImplementation((url: string) => {
        if (url.includes("/users")) return Promise.resolve({ data: { data: mockUsers } });
        if (url.includes("/questions")) return Promise.resolve({ data: mockQuestions });
        return Promise.reject(new Error("Unknown URL"));
    });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AdminPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        setupLocalStorage();
        setupSuccessfulFetches();
        // Silence window.confirm calls unless overridden per test
        vi.spyOn(window, "confirm").mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Rendering ─────────────────────────────────────────────────────────────

    describe("Initial rendering", () => {
        it("renders the sidebar with Admin heading", async () => {
            render(<AdminPage />);
            await waitFor(() => expect(screen.getByRole("heading", { name: "Admin" })).toBeInTheDocument());
        });

        it("renders User Database and Question Bank tab buttons", async () => {
            render(<AdminPage />);
            expect(screen.getByRole("button", { name: "User Database" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Question Bank" })).toBeInTheDocument();
        });

        it("shows UserTable by default on first render", async () => {
            render(<AdminPage />);
            await waitFor(() => expect(screen.getByTestId("user-table")).toBeInTheDocument());
        });

        it("does not show QuestionTable on initial render", async () => {
            render(<AdminPage />);
            expect(screen.queryByTestId("question-table")).not.toBeInTheDocument();
        });
    });

    // ── Tab Switching ─────────────────────────────────────────────────────────

    describe("Tab switching", () => {
        it("switches to Question Bank tab and shows QuestionTable", async () => {
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-table"));

            fireEvent.click(screen.getByText("Question Bank"));

            await waitFor(() => expect(screen.getByTestId("question-table")).toBeInTheDocument());
            expect(screen.queryByTestId("user-table")).not.toBeInTheDocument();
        });

        it("switches back to User Database tab", async () => {
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
            await waitFor(() => screen.getByTestId("question-table"));

            fireEvent.click(screen.getByText("User Database"));

            await waitFor(() => expect(screen.getByTestId("user-table")).toBeInTheDocument());
            expect(screen.queryByTestId("question-table")).not.toBeInTheDocument();
        });

        it("clears error and success messages when switching tabs", async () => {
            render(<AdminPage />);
            // Switch to questions tab, wait for render
            fireEvent.click(screen.getByText("Question Bank"));
            await waitFor(() => screen.getByTestId("question-table"));

            // Switch back to users – messages should be cleared
            fireEvent.click(screen.getByText("User Database"));
            await waitFor(() => screen.getByTestId("user-table"));

            expect(screen.queryByTestId("user-error")).not.toBeInTheDocument();
            expect(screen.queryByTestId("user-success")).not.toBeInTheDocument();
        });
    });

    // ── Data Fetching ─────────────────────────────────────────────────────────

    describe("Data fetching", () => {
        it("fetches and renders users on mount", async () => {
            render(<AdminPage />);
            await waitFor(() => {
                expect(screen.getByTestId("user-row-u1")).toBeInTheDocument();
                expect(screen.getByTestId("user-row-u2")).toBeInTheDocument();
                expect(screen.getByTestId("user-row-u3")).toBeInTheDocument();
            });
        });

        it("fetches and renders questions when Question Bank tab is active", async () => {
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
            await waitFor(() => {
                expect(screen.getByTestId("question-row-q1")).toBeInTheDocument();
                expect(screen.getByTestId("question-row-q2")).toBeInTheDocument();
            });
        });

        it("sends Authorization header when fetching users", async () => {
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-table"));
            expect(mockGet).toHaveBeenCalledWith(
                expect.stringContaining("/users"),
                expect.objectContaining({
                    headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
                })
            );
        });

        it("shows user error when user fetch fails", async () => {
            mockGet.mockRejectedValue(new Error("Network error"));
            render(<AdminPage />);
            await waitFor(() =>
                expect(screen.getByTestId("user-error")).toHaveTextContent("Failed to fetch users.")
            );
        });

        it("shows question error when question fetch fails", async () => {
            mockGet.mockImplementation((url: string) => {
                if (url.includes("/users")) return Promise.resolve({ data: { data: [] } });
                return Promise.reject(new Error("Network error"));
            });
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
            await waitFor(() =>
                expect(screen.getByTestId("question-error")).toHaveTextContent("Failed to fetch questions.")
            );
        });
    });

    // ── Filtering & Searching ─────────────────────────────────────────────────

    describe("User filtering and searching", () => {
        it("filters users by search query", async () => {
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            fireEvent.change(screen.getByTestId("user-search"), { target: { value: "alice" } });

            expect(screen.getByTestId("user-row-u1")).toBeInTheDocument();
            expect(screen.queryByTestId("user-row-u2")).not.toBeInTheDocument();
            expect(screen.queryByTestId("user-row-u3")).not.toBeInTheDocument();
        });

        it("filters users by admin role", async () => {
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            fireEvent.change(screen.getByTestId("filter-admin"), { target: { value: "admin" } });

            expect(screen.queryByTestId("user-row-u1")).not.toBeInTheDocument();
            expect(screen.getByTestId("user-row-u2")).toBeInTheDocument();
            expect(screen.queryByTestId("user-row-u3")).not.toBeInTheDocument();
        });

        it("filters users by non-admin role", async () => {
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            fireEvent.change(screen.getByTestId("filter-admin"), { target: { value: "user" } });

            expect(screen.getByTestId("user-row-u1")).toBeInTheDocument();
            expect(screen.queryByTestId("user-row-u2")).not.toBeInTheDocument();
            expect(screen.getByTestId("user-row-u3")).toBeInTheDocument();
        });

        it("shows all users when filter is set to all", async () => {
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            fireEvent.change(screen.getByTestId("filter-admin"), { target: { value: "user" } });
            fireEvent.change(screen.getByTestId("filter-admin"), { target: { value: "all" } });

            expect(screen.getByTestId("user-row-u1")).toBeInTheDocument();
            expect(screen.getByTestId("user-row-u2")).toBeInTheDocument();
            expect(screen.getByTestId("user-row-u3")).toBeInTheDocument();
        });

        it("filters users case-insensitively", async () => {
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            fireEvent.change(screen.getByTestId("user-search"), { target: { value: "ALICE" } });

            expect(screen.getByTestId("user-row-u1")).toBeInTheDocument();
        });
    });

    describe("Question filtering and searching", () => {
        beforeEach(() => {
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
        });

        it("filters questions by search query matching title", async () => {
            await waitFor(() => screen.getByTestId("question-row-q1"));

            fireEvent.change(screen.getByTestId("question-search"), { target: { value: "Two Sum" } });

            expect(screen.getByTestId("question-row-q1")).toBeInTheDocument();
            expect(screen.queryByTestId("question-row-q2")).not.toBeInTheDocument();
        });

        it("filters questions by search query matching questionId", async () => {
            await waitFor(() => screen.getByTestId("question-row-q1"));

            fireEvent.change(screen.getByTestId("question-search"), { target: { value: "q2" } });

            expect(screen.queryByTestId("question-row-q1")).not.toBeInTheDocument();
            expect(screen.getByTestId("question-row-q2")).toBeInTheDocument();
        });
    });

    // ── User Actions ──────────────────────────────────────────────────────────

    describe("User promote and demote", () => {
        it("promotes a user when confirmed", async () => {
            mockPatch.mockResolvedValue({});
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            const row = screen.getByTestId("user-row-u1");
            fireEvent.click(within(row).getByText("Promote"));

            await waitFor(() =>
                expect(mockPatch).toHaveBeenCalledWith(
                    expect.stringContaining("/users/u1/privilege"),
                    { isAdmin: true },
                    expect.any(Object)
                )
            );
            await waitFor(() =>
                expect(screen.getByTestId("user-success")).toHaveTextContent("User promoted to admin successfully!")
            );
        });

        it("does not promote when user cancels confirm", async () => {
            vi.spyOn(window, "confirm").mockReturnValue(false);
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            fireEvent.click(within(screen.getByTestId("user-row-u1")).getByText("Promote"));

            expect(mockPatch).not.toHaveBeenCalled();
        });

        it("demotes another admin when confirmed", async () => {
            mockPatch.mockResolvedValue({});
            // logged-in user is u2, demote u3 (different user)
            setupLocalStorage({ id: "u1" });
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u2"));

            fireEvent.click(within(screen.getByTestId("user-row-u2")).getByText("Demote"));

            await waitFor(() =>
                expect(mockPatch).toHaveBeenCalledWith(
                    expect.stringContaining("/users/u2/privilege"),
                    { isAdmin: false },
                    expect.any(Object)
                )
            );
        });

        it("prevents self-demotion", async () => {
            // Current user is u2, demote u2 (self)
            setupLocalStorage({ id: "u2" });
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u2"));

            fireEvent.click(within(screen.getByTestId("user-row-u2")).getByText("Demote"));

            await waitFor(() =>
                expect(screen.getByTestId("user-error")).toHaveTextContent("You cannot demote yourself.")
            );
            expect(mockPatch).not.toHaveBeenCalled();
        });

        it("shows error when promote API call fails", async () => {
            mockPatch.mockRejectedValue(new Error("Server error"));
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-row-u1"));

            fireEvent.click(within(screen.getByTestId("user-row-u1")).getByText("Promote"));

            await waitFor(() =>
                expect(screen.getByTestId("user-error")).toHaveTextContent("Failed to promote user.")
            );
        });
    });

    // ── Question CRUD ─────────────────────────────────────────────────────────

    describe("Question deletion", () => {
        beforeEach(() => {
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
        });

        it("deletes a question when confirmed", async () => {
            mockDelete.mockResolvedValue({});
            await waitFor(() => screen.getByTestId("question-row-q1"));

            fireEvent.click(within(screen.getByTestId("question-row-q1")).getByText("Delete"));

            await waitFor(() =>
                expect(mockDelete).toHaveBeenCalledWith(
                    expect.stringContaining("/questions/q1"),
                    expect.any(Object)
                )
            );
            await waitFor(() =>
                expect(screen.getByTestId("question-success")).toHaveTextContent("Question deleted successfully!")
            );
        });

        it("does not delete when user cancels confirm", async () => {
            vi.spyOn(window, "confirm").mockReturnValue(false);
            await waitFor(() => screen.getByTestId("question-row-q1"));

            fireEvent.click(within(screen.getByTestId("question-row-q1")).getByText("Delete"));

            expect(mockDelete).not.toHaveBeenCalled();
        });

        it("shows error when delete API fails", async () => {
            mockDelete.mockRejectedValue(new Error("Server error"));
            await waitFor(() => screen.getByTestId("question-row-q1"));

            fireEvent.click(within(screen.getByTestId("question-row-q1")).getByText("Delete"));

            await waitFor(() =>
                expect(screen.getByTestId("question-error")).toHaveTextContent("Failed to delete question.")
            );
        });
    });

    // ── Modals ────────────────────────────────────────────────────────────────

    describe("Add Question Modal", () => {
        beforeEach(async () => {
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
            await waitFor(() => screen.getByTestId("add-question-btn"));
            fireEvent.click(screen.getByTestId("add-question-btn"));
        });

        it("opens AddQuestionModal when Add Question button is clicked", () => {
            expect(screen.getByTestId("add-question-modal")).toBeInTheDocument();
        });

        it("closes AddQuestionModal when onClose is called", () => {
            fireEvent.click(screen.getByTestId("close-add-modal"));
            expect(screen.queryByTestId("add-question-modal")).not.toBeInTheDocument();
        });
    });

    describe("Edit Question Modal", () => {
        it("does not show EditQuestionModal initially", async () => {
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
            await waitFor(() => screen.getByTestId("question-table"));
            expect(screen.queryByTestId("edit-question-modal")).not.toBeInTheDocument();
        });
    });

    describe("Upload JSON Modal", () => {
        beforeEach(async () => {
            render(<AdminPage />);
            fireEvent.click(screen.getByText("Question Bank"));
            await waitFor(() => screen.getByTestId("upload-json-btn"));
            fireEvent.click(screen.getByTestId("upload-json-btn"));
        });

        it("opens UploadJSONFile modal when Upload JSON button is clicked", () => {
            expect(screen.getByTestId("upload-json-modal")).toBeInTheDocument();
        });

        it("closes UploadJSONFile modal when onClose is called", () => {
            fireEvent.click(screen.getByTestId("close-upload-modal"));
            expect(screen.queryByTestId("upload-json-modal")).not.toBeInTheDocument();
        });
    });

    // ── LocalStorage ──────────────────────────────────────────────────────────

    describe("Auth from localStorage", () => {
        it("reads token from localStorage and uses it in API calls", async () => {
            setupLocalStorage({ token: "my-special-token" });
            render(<AdminPage />);
            await waitFor(() => screen.getByTestId("user-table"));
            expect(mockGet).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({ Authorization: "Bearer my-special-token" }),
                })
            );
        });

        it("handles missing localStorage gracefully (no crash)", () => {
            localStorage.clear();
            expect(() => render(<AdminPage />)).not.toThrow();
        });
    });
});