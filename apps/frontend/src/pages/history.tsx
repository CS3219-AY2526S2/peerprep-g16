import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Attempt } from "../types/attempt";
import { fetchUserAttempts } from "../api/attemptService";
import styles from "../components/styles";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function History() {
  const navigate = useNavigate();

  const stored = localStorage.getItem("login");
  const user = stored ? JSON.parse(stored) : null;
  const userId = user?.id ?? "";
  const token = user?.token ?? "";

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const loadAttempts = async () => {
      if (!userId || !token) {
        setError("Unable to load history.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const data = await fetchUserAttempts(userId, token);
        setAttempts(data);
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to load attempt history.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAttempts();
  }, [userId, token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, topicFilter, pageSize]);

  const availableTopics = useMemo(() => {
    return Array.from(
      new Set(attempts.flatMap((attempt) => attempt.topic ?? [])),
    ).sort((a, b) => a.localeCompare(b));
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return attempts.filter((attempt) => {
      const title = attempt.questionTitle?.toLowerCase() ?? "";
      const topics = attempt.topic ?? [];
      const topicText = topics.join(" ").toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        title.includes(normalizedSearch) ||
        topicText.includes(normalizedSearch);

      const matchesTopic =
        topicFilter === "all" || topics.includes(topicFilter);

      return matchesSearch && matchesTopic;
    });
  }, [attempts, searchQuery, topicFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAttempts.length / pageSize));

  const paginatedAttempts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAttempts.slice(startIndex, startIndex + pageSize);
  }, [filteredAttempts, currentPage, pageSize]);

  const handleOpenAttempt = (attempt: Attempt) => {
    navigate(`/history/${attempt._id}`);
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Attempt History</h2>

      <div style={styles.filtersRow}>
        <div style={styles.searchBox}>
          <span>Search</span>
          <input
            type="text"
            placeholder="Search by title or topic"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Topics</option>
          {availableTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>

        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          style={styles.filterSelect}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p>Loading attempt history...</p>}

      {error && <p style={styles.errorText}>{error}</p>}

      {!isLoading && !error && (
        <>
          <table style={styles.table}>
            <colgroup>
              <col style={{ width: "35%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>

            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Topic</th>
                <th style={styles.th}>Difficulty</th>
                <th style={styles.th}>Date Attempted</th>
              </tr>
            </thead>

            <tbody>
              {paginatedAttempts.length > 0 ? (
                paginatedAttempts.map((attempt) => (
                  <tr key={attempt._id} style={styles.tr}>
                    <td style={styles.td}>
                      <button
                        type="button"
                        onClick={() => handleOpenAttempt(attempt)}
                        style={{
                          ...styles.titleButton,
                          cursor: "pointer",
                        }}
                      >
                        {attempt.questionTitle}
                      </button>
                    </td>

                    <td style={styles.td}>
                      {attempt.topic.length > 0
                        ? attempt.topic.join(", ")
                        : "-"}
                    </td>

                    <td style={styles.td}>{attempt.difficulty || "-"}</td>

                    <td style={styles.td}>
                      {new Date(attempt.attemptedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={styles.emptyState}>
                    No attempts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={styles.paginationRow}>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              style={{
                ...styles.pageButton,
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span style={styles.pageText}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              style={{
                ...styles.pageButton,
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default History;
