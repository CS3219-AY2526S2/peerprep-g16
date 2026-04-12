import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Navigate, useParams } from "react-router-dom";
import { fetchUserAttempt } from "../api/attemptService";
import type { Attempt } from "../types/attempt";

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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>{attempt.questionTitle}</h2>
          <p style={styles.meta}>
            {(attempt.topic ?? []).join(", ") || "-"} ·{" "}
            {attempt.difficulty || "-"}
          </p>
        </div>

        <div style={styles.stats}>
          <span>Language: {attempt.language || "-"}</span>
          <span>Hints: {attempt.hintsUsed ?? 0}</span>
          <span>Passed: {attempt.testCasesPassed ?? 0}</span>
          <span>{new Date(attempt.attemptedAt).toLocaleString()}</span>
        </div>
      </header>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Whiteboard Snapshot</h3>

        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt="Whiteboard snapshot"
            style={styles.screenshot}
          />
        ) : (
          <div style={styles.emptyState}>No whiteboard snapshot was saved.</div>
        )}
      </section>
    </div>
  );
}

export default AttemptReview;

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    marginTop: "80px",
    padding: "28px 40px",
    background: "#f5f4f2",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    marginBottom: "24px",
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    color: "#1a1a2e",
    fontSize: "24px",
  },
  meta: {
    margin: "8px 0 0",
    color: "#555",
  },
  stats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "flex-end",
    color: "#333",
    fontSize: "14px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 420px",
    gap: "20px",
    height: "calc(100vh - 190px)",
    minHeight: "560px",
  },
  whiteboardPanel: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  codePanel: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: "16px",
    color: "#333",
  },
  excalidrawShell: {
    flex: 1,
    minHeight: 0,
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#fff",
  },
  code: {
    flex: 1,
    resize: "none",
    border: "1px solid #2a2a4e",
    borderRadius: "8px",
    padding: "16px",
    background: "#0d1117",
    color: "#e6edf3",
    fontFamily: "monospace",
    fontSize: "13px",
    lineHeight: "1.7",
    outline: "none",
  },
  section: {
    marginTop: "24px",
  },
  screenshot: {
    width: "100%",
    maxHeight: "calc(100vh - 240px)",
    objectFit: "contain",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },
  emptyState: {
    padding: "24px",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    color: "#666",
  },
};
