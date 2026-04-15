import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { fetchUserAttempt } from "../api/attemptService";
import type { Attempt } from "../types/attempt";
import { fetchQuestion, type Question } from "../api/questionService";

function bufferToDataUrl(buffer?: { type: "Buffer"; data: number[] }) {
  if (!buffer?.data?.length) return "";

  const bytes = new Uint8Array(buffer.data);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:image/png;base64,${window.btoa(binary)}`;
}

function AttemptReview() {
  const { attemptId } = useParams<{ attemptId: string }>();

  const stored = localStorage.getItem("login");
  const user = stored ? JSON.parse(stored) : null;
  const userId = user?.id ?? "";
  const token = user?.token ?? "";

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);

  const navigate = useNavigate();


  useEffect(() => {
    if (!attemptId || !userId || !token) {
      setIsLoading(false);
      return;
    }

    const loadAttempt = async () => {
      try {
        setIsLoading(true);
        setError("");

        const data = await fetchUserAttempt(userId, attemptId, token);
        setAttempt(data);

        try {
          const questionData = await fetchQuestion(data.questionId);
          setQuestion(questionData);
        } catch (questionErr) {
          console.warn("Failed to load question details:", questionErr);
          setQuestion(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load attempt.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId, userId, token]);

  const screenshotSrc = useMemo(
    () => bufferToDataUrl(attempt?.whiteboardScreenshot),
    [attempt],
  );

  if (!attemptId || !user) return <Navigate to="/" replace />;

  if (isLoading) return <div style={styles.page}>Loading attempt...</div>;

  if (error || !attempt) {
    return <div style={styles.page}>{error || "Attempt not found."}</div>;
  }

  const topics = question?.topic ?? attempt.topic ?? [];
  const difficulty = question?.difficulty ?? attempt.difficulty;
  const difficultyColor = COLORS[difficulty] ?? COLORS.Hard;
  const code = attempt.code || "# No code was saved for this attempt.";

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.panelToggle}>
          <button
            type="button"
            style={{
              ...styles.panelButton,
              background: "#6a4c93",
              color: "#fff",
            }}
          >
            Whiteboard
          </button>

          <button
            type="button"
            style={{
              ...styles.panelButton,
              background: "#6a4c93",
              color: "#fff",
            }}
          >
            Code
          </button>

          <button
            type="button"
            onClick={() => navigate(`/modelSolution/${attempt.questionId}`)}
            style={{
              ...styles.panelButton,
              background: "#6a4c93",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Model Answer
          </button>
        </div>

        <div style={styles.sessionInfo}>
          <span style={styles.sessionText}>Attempt Review</span>
        </div>

        <div style={styles.reviewStats}>
          <span>Language: {attempt.language || "-"}</span>
          <span>Hints: {attempt.hintsUsed ?? 0}</span>
          <span>Passed: {attempt.testCasesPassed ?? 0}</span>
          <span>{new Date(attempt.attemptedAt).toLocaleString()}</span>
        </div>
      </header>

      <div style={styles.layoutGrid}>
        <div style={styles.questionColumn}>
          <div>
            <div style={styles.problemHeader}>
              <div style={{ flex: 1 }}>
                <h2 style={styles.problemTitle}>
                  {question?.title ?? attempt.questionTitle}
                </h2>

                <div style={styles.tagRow}>
                  <span
                    style={{
                      ...styles.difficultyTag,
                      color: difficultyColor,
                      background: `${difficultyColor}18`,
                    }}
                  >
                    {difficulty}
                  </span>

                  {topics.map((topic) => (
                    <span key={topic} style={styles.tag}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p style={styles.description}>
              {question?.description ?? "Question details unavailable."}
            </p>

            <div style={styles.constraintsCard}>
              <div style={styles.constraintsTitle}>Constraints</div>
              {question?.constraints?.length ? (
                <ul style={styles.constraintsList}>
                  {question.constraints.map((constraint, index) => (
                    <li key={index} style={styles.constraint}>
                      {constraint}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={styles.emptyText}>No constraints available.</div>
              )}
            </div>

            <div style={styles.constraintsCard}>
              <div style={styles.constraintsTitle}>Sample Test Cases</div>
              {question?.testCases?.sample?.length ? (
                <ul style={styles.constraintsList}>
                  {question.testCases.sample.map((testCase, index) => (
                    <li key={index} style={styles.constraint}>
                      Input: {String(testCase.input)} - Output:{" "}
                      {String(testCase.expectedOutput)}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={styles.emptyText}>
                  No sample test cases available.
                </div>
              )}
            </div>

            <div style={styles.constraintsCard}>
              <div style={styles.constraintsTitle}>Hints Used</div>
              <div style={styles.emptyText}>{attempt.hintsUsed ?? 0}</div>
            </div>
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.whiteboard}>
            <div style={styles.panelHeader}>Whiteboard Snapshot</div>

            <div style={styles.whiteboardFrame}>
              {screenshotSrc ? (
                <img
                  src={screenshotSrc}
                  alt="Whiteboard snapshot"
                  style={styles.whiteboardImage}
                />
              ) : (
                <div style={styles.emptyState}>
                  No whiteboard snapshot was saved.
                </div>
              )}
            </div>
          </div>

          <div style={styles.codeSpace}>
            <div style={styles.codeHeader}>
              <span style={styles.codeTitle}>{"</>"} Code</span>
              <span style={styles.languageBadge}>
                {attempt.language || "-"}
              </span>
            </div>

            <textarea
              value={code}
              readOnly
              spellCheck={false}
              style={styles.readOnlyCode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttemptReview;

const COLORS: Record<string, string> = {
  Easy: "#2a9d8f",
  Medium: "#dd842bff",
  Hard: "#ff0000ff",
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f4f2",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    marginTop: "55px",
    padding: "14px 28px",
    background: "#1a1a2e",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
  },
  panelToggle: {
    marginLeft: "auto",
    display: "flex",
    background: "#2a2a4e",
    borderRadius: "8px",
    padding: "3px",
    gap: "2px",
  },
  panelButton: {
    padding: "5px 14px",
    borderRadius: "6px",
    border: "none",
    fontSize: "12px",
    fontWeight: 600,
  },
  sessionInfo: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    background: "#2a2a4e",
    borderRadius: "8px",
  },
  sessionText: {
    color: "#a9b1d6",
    fontSize: "12px",
    textTransform: "capitalize",
  },
  reviewStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    color: "#a9b1d6",
    fontSize: "12px",
  },
  layoutGrid: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: "0",
    minHeight: 0,
    height: "calc(100vh - 60px)",
  },
  questionColumn: {
    padding: "20px 16px",
    background: "#fff",
    borderRight: "1px solid #e9ecef",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  problemHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "12px",
  },
  problemTitle: {
    margin: "0 0 6px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#1a1a2e",
    lineHeight: 1.2,
  },
  tagRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  difficultyTag: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "12px",
  },
  tag: {
    fontSize: "11px",
    color: "#6a4c93",
    background: "#6a4c9318",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  description: {
    fontSize: "14px",
    color: "#495057",
    lineHeight: "1.7",
    margin: "0 0 16px",
  },
  constraintsCard: {
    background: "#f8f9fa",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "12px",
    color: "#495057",
    marginBottom: "12px",
  },
  constraintsTitle: {
    fontWeight: 600,
    color: "#1a1a2e",
    marginBottom: "6px",
  },
  constraintsList: {
    margin: 0,
    paddingLeft: "16px",
    lineHeight: "1.8",
  },
  constraint: {
    fontFamily: "monospace",
  },
  emptyText: {
    color: "#868e96",
    fontSize: "12px",
  },
  rightColumn: {
    padding: "20px",
    display: "flex",
    gap: "16px",
    overflow: "hidden",
    height: "100%",
  },
  whiteboard: {
    flex: "1 1 50%",
    minWidth: 0,
    height: "100%",
    transition: "flex 0.3s ease",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  codeSpace: {
    flex: "1 1 50%",
    minWidth: 0,
    height: "100%",
    transition: "flex 0.3s ease",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    background: "#1a1a2e",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
  },
  whiteboardFrame: {
    flex: 1,
    minHeight: 0,
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  whiteboardImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#fff",
  },
  emptyState: {
    padding: "24px",
    color: "#666",
  },
  codeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    background: "#1a1a2e",
    borderRadius: "8px",
    color: "#fff",
  },
  codeTitle: {
    fontSize: "13px",
    fontWeight: 600,
  },
  languageBadge: {
    marginLeft: "auto",
    background: "#2a2a4e",
    color: "#a9b1d6",
    border: "1px solid #3a3a6e",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "12px",
  },
  readOnlyCode: {
    flex: 1,
    minHeight: 0,
    resize: "none",
    border: "1px solid #2a2a4e",
    borderRadius: "8px",
    padding: "16px",
    background: "#0d1117",
    color: "#e6edf3",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: "13px",
    lineHeight: "1.7",
    outline: "none",
  },
};
