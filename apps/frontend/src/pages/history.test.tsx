import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import History from "./history";
import { fetchUserAttempts } from "../api/attemptService";
import type { Attempt } from "../types/attempt";

const navigateMock = vi.fn();

/**
 * Replaces React Router's navigation hook so tests can verify route changes
 * without needing to render the full application router.
 */
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

/**
 * Replaces the attempt API layer so the History page can be tested with
 * predictable attempt data and without making real HTTP requests.
 */
vi.mock("../api/attemptService", () => ({
  fetchUserAttempts: vi.fn(),
}));

const attempts: Attempt[] = [
  {
    _id: "attempt-1",
    questionId: "two-sum",
    questionTitle: "Two Sum",
    topic: ["Arrays"],
    difficulty: "Easy",
    language: "javascript",
    hintsUsed: 1,
    testCasesPassed: 5,
    duration: 120000,
    attemptedAt: "2026-04-14T10:00:00.000Z",
  },
  {
    _id: "attempt-2",
    questionId: "number-of-islands",
    questionTitle: "Number of Islands",
    topic: ["Graphs", "DFS"],
    difficulty: "Medium",
    language: "python",
    hintsUsed: 0,
    testCasesPassed: 8,
    duration: 240000,
    attemptedAt: "2026-04-13T10:00:00.000Z",
  },
];

/**
 * Seeds localStorage with a logged-in user because History reads auth state
 * directly from localStorage before calling the attempt service.
 */
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

  navigateMock.mockClear();
  vi.mocked(fetchUserAttempts).mockReset();
});

describe("History", () => {
  /**
   * Verifies the page requests attempts for the current user and renders the
   * returned rows once loading completes.
   */
  it("loads and displays attempt history for the logged-in user", async () => {
    vi.mocked(fetchUserAttempts).mockResolvedValueOnce(attempts);

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading attempt history...")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchUserAttempts).toHaveBeenCalledWith("user-1", "token-1");
    });

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Number of Islands")).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Arrays")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Graphs, DFS")).toBeInTheDocument();
  });

  /**
   * Verifies the search box filters attempts by question title or topic text.
   */
  it("filters attempts by search text", async () => {
    vi.mocked(fetchUserAttempts).mockResolvedValueOnce(attempts);

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    await screen.findByText("Two Sum");

    await userEvent.type(
      screen.getByPlaceholderText("Search by title or topic"),
      "islands",
    );

    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    expect(screen.getByText("Number of Islands")).toBeInTheDocument();
  });

  /**
   * Verifies the topic dropdown filters the table to attempts containing the
   * selected topic.
   */
  it("filters attempts by topic", async () => {
    vi.mocked(fetchUserAttempts).mockResolvedValueOnce(attempts);

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    await screen.findByText("Two Sum");

    await userEvent.selectOptions(
      screen.getByDisplayValue("All Topics"),
      "DFS",
    );

    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    expect(screen.getByText("Number of Islands")).toBeInTheDocument();
  });

  /**
   * Verifies clicking a question title sends the user to the attempt review
   * route for that attempt.
   */
  it("navigates to the attempt review page when an attempt title is clicked", async () => {
    vi.mocked(fetchUserAttempts).mockResolvedValueOnce(attempts);

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Two Sum" }),
    );

    expect(navigateMock).toHaveBeenCalledWith("/history/attempt-1");
  });

  /**
   * Verifies the table shows an empty state when the user has no saved attempts.
   */
  it("shows an empty state when there are no attempts", async () => {
    vi.mocked(fetchUserAttempts).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No attempts found.")).toBeInTheDocument();
  });

  /**
   * Verifies API errors are surfaced to the user instead of leaving the page in
   * a loading or blank state.
   */
  it("shows an error when attempt history cannot be loaded", async () => {
    vi.mocked(fetchUserAttempts).mockRejectedValueOnce({
      response: {
        data: {
          message: "Not authorized to access this resource",
        },
      },
    });

    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Not authorized to access this resource"),
    ).toBeInTheDocument();
  });
});
