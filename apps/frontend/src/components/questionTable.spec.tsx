import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import QuestionTable from "./questionTable";

vi.mock("./styles", () => ({
  default: {
    searchBox: {},
    searchInput: {},
    filterSelect: {},
    addQuestionButton: {},
    table: {},
    th: {},
    tr: {},
    td: {},
    promoteButton: {},
  },
}));

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
  testCases: { sample: TestCase[]; hidden: TestCase[] };
  modelAnswer: string;
  modelAnswerTimeComplexity: string;
  modelAnswerExplanation: string;
}

const mockQuestions: Question[] = [
  {
    questionId: "two-sum",
    title: "Two Sum",
    topic: ["Array", "Hash Table"],
    difficulty: "Easy",
    description: "Find two numbers that add up to target",
    constraints: [],
    examples: [],
    hints: [],
    testCases: { sample: [], hidden: [] },
    modelAnswer: "",
    modelAnswerTimeComplexity: "O(n)",
    modelAnswerExplanation: "",
  },
  {
    questionId: "merge-intervals",
    title: "Merge Intervals",
    topic: ["Array", "Sorting"],
    difficulty: "Medium",
    description: "Merge overlapping intervals",
    constraints: [],
    examples: [],
    hints: [],
    testCases: { sample: [], hidden: [] },
    modelAnswer: "",
    modelAnswerTimeComplexity: "O(n log n)",
    modelAnswerExplanation: "",
  },
];

describe("QuestionTable", () => {
  const setFilterTopic = vi.fn();
  const setFilterDifficulty = vi.fn();
  const handleSort = vi.fn();
  const handleDeleteQuestion = vi.fn();
  const setEditQuestion = vi.fn();
  const setShowEditQuestion = vi.fn();
  const setQuestionError = vi.fn();
  const setShowAddQuestion = vi.fn();
  const setShowJSONUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderComponent({
    searchQuery = "",
    setQuestionSearchQuery = vi.fn(),
    filteredQuestions = mockQuestions,
    questionSuccess = "Success message",
    questionError = "Error message",
  }: {
    searchQuery?: string;
    setQuestionSearchQuery?: (v: string) => void;
    filteredQuestions?: Question[];
    questionSuccess?: string;
    questionError?: string;
  } = {}) {
    return render(
      <QuestionTable
        questions={mockQuestions}
        filteredQuestions={filteredQuestions}
        questionSearchQuery={searchQuery}
        setQuestionSearchQuery={setQuestionSearchQuery}
        filterTopic="all"
        setFilterTopic={setFilterTopic}
        filterDifficulty="all"
        setFilterDifficulty={setFilterDifficulty}
        sortField="questionId"
        sortOrder="asc"
        handleSort={handleSort}
        handleDeleteQuestion={handleDeleteQuestion}
        setEditQuestion={setEditQuestion}
        setShowEditQuestion={setShowEditQuestion}
        setQuestionError={setQuestionError}
        setShowAddQuestion={setShowAddQuestion}
        questionSuccess={questionSuccess}
        questionError={questionError}
        setShowJSONUpload={setShowJSONUpload}
      />
    );
  }

  it("renders the table title and question rows", () => {
    renderComponent();

    expect(screen.getByRole("heading", { name: /question bank/i })).toBeInTheDocument();
    expect(screen.getByText("two-sum")).toBeInTheDocument();
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("merge-intervals")).toBeInTheDocument();
    expect(screen.getByText("Merge Intervals")).toBeInTheDocument();
  });

  it("renders search input and filter dropdowns", () => {
    renderComponent();

    expect(screen.getByPlaceholderText(/search by question id/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ add question/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload json/i })).toBeInTheDocument();
    expect(screen.getByText("All Topics")).toBeInTheDocument();
    expect(screen.getByText("All Difficulties")).toBeInTheDocument();
  });

  it("updates the controlled search input properly", async () => {
    const user = userEvent.setup();
    const setQuestionSearchQuerySpy = vi.fn();

    function Wrapper() {
      const [query, setQuery] = React.useState("");

      const handleSetQuery = (value: string) => {
        setQuery(value);
        setQuestionSearchQuerySpy(value);
      };

      return (
        <QuestionTable
          questions={mockQuestions}
          filteredQuestions={mockQuestions}
          questionSearchQuery={query}
          setQuestionSearchQuery={handleSetQuery}
          filterTopic="all"
          setFilterTopic={setFilterTopic}
          filterDifficulty="all"
          setFilterDifficulty={setFilterDifficulty}
          sortField="questionId"
          sortOrder="asc"
          handleSort={handleSort}
          handleDeleteQuestion={handleDeleteQuestion}
          setEditQuestion={setEditQuestion}
          setShowEditQuestion={setShowEditQuestion}
          setQuestionError={setQuestionError}
          setShowAddQuestion={setShowAddQuestion}
          questionSuccess=""
          questionError=""
          setShowJSONUpload={setShowJSONUpload}
        />
      );
    }

    render(<Wrapper />);

    const input = screen.getByPlaceholderText(/search by question id/i);
    await user.type(input, "two");

    expect(input).toHaveValue("two");
    expect(setQuestionSearchQuerySpy).toHaveBeenNthCalledWith(1, "t");
    expect(setQuestionSearchQuerySpy).toHaveBeenNthCalledWith(2, "tw");
    expect(setQuestionSearchQuerySpy).toHaveBeenNthCalledWith(3, "two");
  });

  it("calls handleSort when sortable headers are clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("columnheader", { name: /id/i }));
    await user.click(screen.getByRole("columnheader", { name: /title/i }));
    await user.click(screen.getByRole("columnheader", { name: /topic/i }));
    await user.click(screen.getByRole("columnheader", { name: /difficulty/i }));

    expect(handleSort).toHaveBeenNthCalledWith(1, "questionId");
    expect(handleSort).toHaveBeenNthCalledWith(2, "title");
    expect(handleSort).toHaveBeenNthCalledWith(3, "topic");
    expect(handleSort).toHaveBeenNthCalledWith(4, "difficulty");
  });

  it("calls add question handlers when Add Question is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: /\+ add question/i }));

    expect(setShowAddQuestion).toHaveBeenCalledWith(true);
    expect(setQuestionError).toHaveBeenCalledWith("");
  });

  it("calls upload JSON handlers when Upload JSON is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: /upload json/i }));

    expect(setShowJSONUpload).toHaveBeenCalledWith(true);
    expect(setQuestionError).toHaveBeenCalledWith("");
  });

  it("calls edit handlers when Edit is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    expect(setEditQuestion).toHaveBeenCalledWith({ ...mockQuestions[0] });
    expect(setShowEditQuestion).toHaveBeenCalledWith(true);
    expect(setQuestionError).toHaveBeenCalledWith("");
  });

  it("calls delete handler with questionId when Delete is clicked", async () => {
    const user = userEvent.setup();
    renderComponent();

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(handleDeleteQuestion).toHaveBeenCalledWith("two-sum");
  });

  it("renders success and error messages", () => {
    renderComponent();

    expect(screen.getByText("Success message")).toBeInTheDocument();
    expect(screen.getByText("Error message")).toBeInTheDocument();
  });

  it("renders joined topic array correctly", () => {
    renderComponent();

    expect(screen.getByText("Array, Hash Table")).toBeInTheDocument();
    expect(screen.getByText("Array, Sorting")).toBeInTheDocument();
  });
});