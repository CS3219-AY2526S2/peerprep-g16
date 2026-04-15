import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import api from "../api/axiosInstance";
import ModelAnswer from "./modelAnswer";

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

vi.mock("../api/axiosInstance", async () => {
  return {
    default: {
      get: vi.fn(),
    },
  };
});

vi.mock("../components/styles", async () => {
  return {
    default: {
      page: { backgroundColor: "lightgray" },
      sectionTitle: { fontWeight: "bold" },
    },
  };
});

vi.stubEnv("VITE_QUESTION_SERVICE_URL", "http://localhost:3000/api");

// --- Helper ---
const renderInRouter = (
  route = "/model-answer/123",
  path = "/model-answer/:questionId"
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={<ModelAnswer />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ModelAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockUseParams.mockReset();
    mockUseParams.mockReturnValue({ questionId: "123" });
  });

  it("redirects to /homepage when questionId is missing", async () => {
    mockUseParams.mockReturnValue({ questionId: undefined });

    renderInRouter("/model-answer", "/model-answer");

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/homepage", {
        replace: true,
      });
    });
  });

  it("shows loading state while fetching", () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));

    renderInRouter();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays model answer when data is loaded successfully", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/model-answer")) {
        return Promise.resolve({
          data: {
            modelAnswer: "for (let i = 0; i < n; i++) {}",
            modelAnswerTimeComplexity: "O(n)",
            modelAnswerExplanation: "Loop through each element once.",
          },
        });
      }

      if (url.includes("/description")) {
        return Promise.resolve({
          data: { description: "Find the sum of an array." },
        });
      }

      return Promise.reject(new Error("Unexpected URL"));
    });

    renderInRouter();

    await waitFor(() => {
      expect(screen.getByText("Model Answer")).toBeInTheDocument();
      expect(screen.getByText("Question:")).toBeInTheDocument();
      expect(screen.getByText("Find the sum of an array.")).toBeInTheDocument();
      expect(screen.getByText("Answer:")).toBeInTheDocument();
      expect(screen.getByText("for (let i = 0; i < n; i++) {}")).toBeInTheDocument();
      expect(screen.getByText("Time Complexity:")).toBeInTheDocument();
      expect(screen.getByText("O(n)")).toBeInTheDocument();
      expect(screen.getByText("Explanation:")).toBeInTheDocument();
      expect(screen.getByText("Loop through each element once.")).toBeInTheDocument();
    });
  });

  it("shows 'Model answer unavailable' when model answer request fails", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/model-answer")) {
        return Promise.reject(new Error("Network error"));
      }

      if (url.includes("/description")) {
        return Promise.resolve({
          data: { description: "Find the sum of an array." },
        });
      }

      return Promise.reject(new Error("Unexpected URL"));
    });

    renderInRouter();

    await waitFor(() => {
      expect(screen.getByText("Model answer unavailable.")).toBeInTheDocument();
    });
  });

  it("handles missing question description gracefully", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/model-answer")) {
        return Promise.resolve({
          data: {
            modelAnswer: "for (let i = 0; i < n; i++) {}",
            modelAnswerTimeComplexity: "O(n)",
            modelAnswerExplanation: "Loop through each element once.",
          },
        });
      }

      if (url.includes("/description")) {
        return Promise.reject(new Error("Not found"));
      }

      return Promise.reject(new Error("Unexpected URL"));
    });

    const { container } = renderInRouter();

    await waitFor(() => {
      expect(screen.getByText("Model Answer")).toBeInTheDocument();
      expect(screen.getByText("Question:")).toBeInTheDocument();
      expect(screen.getByText("Answer:")).toBeInTheDocument();
      expect(screen.getByText("for (let i = 0; i < n; i++) {}")).toBeInTheDocument();
    });

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs[0]).toBeEmptyDOMElement();
  });
});