import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AttemptReview from "./attemptReview";
import { fetchUserAttempt } from "../api/attemptService";
import { fetchQuestion } from "../api/questionService";
import type { Attempt } from "../types/attempt";

vi.mock("../api/attemptService", () => ({
  fetchUserAttempt: vi.fn(),
}));

vi.mock("../api/questionService", () => ({
  fetchQuestion: vi.fn(),
}));

const attempt: Attempt = {
  _id: "attempt-1",
  questionId: "two-sum",
  questionTitle: "Two Sum From Attempt",
  topic: ["Arrays"],
  difficulty: "Easy",
  code: "function twoSum() { return [0, 1]; }",
  language: "javascript",
  hintsUsed: 2,
  testCasesPassed: 5,
  duration: 120000,
  whiteboardScreenshot: {
    type: "Buffer" as const,
    data: [137, 80, 78, 71],
  },
  attemptedAt: "2026-04-14T10:00:00.000Z",
};

const question = {
  questionId: "two-sum",
  title: "Two Sum",
  topic: ["Arrays", "Hash Table"],
  difficulty: "Easy" as const,
  description: "Find two numbers that add up to target.",
  constraints: ["2 <= nums.length <= 10^4"],
  hints: ["Use a map."],
  testCases: {
    sample: [
      {
        input: "nums = [2,7,11,15], target = 9",
        expectedOutput: "[0,1]",
      },
    ],
    hidden: [],
  },
};

/**
 * Renders AttemptReview inside a route that provides the attemptId URL param,
 * matching the real /history/:attemptId application route.
 */
function renderAttemptReview(path = "/history/attempt-1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/history/:attemptId" element={<AttemptReview />} />
        <Route path="/" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "login",
    JSON.stringify({
      userLogin: true,
      id: "user-1",
      token: "token-1",
      username: "alice",
      isAdmin: false,
    }),
  );

  vi.mocked(fetchUserAttempt).mockReset();
  vi.mocked(fetchQuestion).mockReset();
});

describe("AttemptReview", () => {
  /**
   * Verifies the page loads both saved attempt data and full question details,
   * then renders the combined review view.
   */
  it("loads the attempt and question details", async () => {
    vi.mocked(fetchUserAttempt).mockResolvedValueOnce(attempt);
    vi.mocked(fetchQuestion).mockResolvedValueOnce(question);

    renderAttemptReview();

    expect(screen.getByText("Loading attempt...")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchUserAttempt).toHaveBeenCalledWith(
        "user-1",
        "attempt-1",
        "token-1",
      );
    });

    expect(fetchQuestion).toHaveBeenCalledWith("two-sum");

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(
      screen.getByText("Find two numbers that add up to target."),
    ).toBeInTheDocument();
    expect(screen.getByText("Hash Table")).toBeInTheDocument();
    expect(screen.getByText("Language: javascript")).toBeInTheDocument();
    expect(screen.getByText("Hints: 2")).toBeInTheDocument();
    expect(screen.getByText("Passed: 5")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("function twoSum() { return [0, 1]; }"),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Whiteboard snapshot")).toBeInTheDocument();
  });

  /**
   * Verifies the page still renders useful saved attempt data when the question
   * service is unavailable.
   */
  it("falls back to attempt data when question details fail to load", async () => {
    vi.mocked(fetchUserAttempt).mockResolvedValueOnce(attempt);
    vi.mocked(fetchQuestion).mockRejectedValueOnce(
      new Error("question failed"),
    );

    renderAttemptReview();

    expect(await screen.findByText("Two Sum From Attempt")).toBeInTheDocument();
    expect(
      screen.getByText("Question details unavailable."),
    ).toBeInTheDocument();
    expect(screen.getByText("Arrays")).toBeInTheDocument();
  });

  /**
   * Verifies failed attempt lookup errors are displayed to the user.
   */
  it("shows an error when the attempt cannot be loaded", async () => {
    vi.mocked(fetchUserAttempt).mockRejectedValueOnce({
      response: {
        data: {
          message: "Attempt not found",
        },
      },
    });

    renderAttemptReview();

    expect(await screen.findByText("Attempt not found")).toBeInTheDocument();
  });

  /**
   * Verifies users without login state are redirected away from protected review
   * content.
   */
  it("redirects to login when there is no logged-in user", async () => {
    localStorage.clear();

    renderAttemptReview();

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  /**
   * Verifies the review page handles attempts that do not have a saved
   * whiteboard image.
   */
  it("shows the no-snapshot state when no whiteboard screenshot exists", async () => {
    vi.mocked(fetchUserAttempt).mockResolvedValueOnce({
      ...attempt,
      whiteboardScreenshot: undefined,
    });
    vi.mocked(fetchQuestion).mockResolvedValueOnce(question);

    renderAttemptReview();

    expect(
      await screen.findByText("No whiteboard snapshot was saved."),
    ).toBeInTheDocument();
  });
});
