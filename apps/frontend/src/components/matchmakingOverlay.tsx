import React from "react";
import styles from "./styles";

interface Props {
  isTimeout: boolean;
  matchStatus: string;
  elapsed: number;
  topic: string;
  difficulty: string;
  onCancel: () => void;
  onDismiss: () => void;
  isRedirecting: boolean;
}

function MatchmakingOverlay({
  isTimeout,
  matchStatus,
  elapsed,
  topic,
  difficulty,
  onCancel,
  onDismiss,
  isRedirecting,
}: Props) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        {isTimeout ? (
          <>
            <h3 style={{ marginBottom: "10px", color: "red" }}>No Match Found</h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
              Sorry, there are no available matches at the moment. Please try again later.
            </p>
            <button onClick={onDismiss} style={styles.acceptButton}>
              OK
            </button>
          </>
        ) : (
          <>
            <div style={styles.spinner} />
            <h3 style={{ marginBottom: "10px" }}>{matchStatus}</h3>
            <p style={{ fontSize: "16px", color: "#666", marginBottom: "8px" }}>
              Time elapsed:{" "}
              <span style={{ fontWeight: "bold", color: "#333" }}>
                {Math.floor(elapsed / 60).toString().padStart(2, "0")}:
                {(elapsed % 60).toString().padStart(2, "0")}
              </span>
            </p>

            {elapsed < 60 && (
              <p style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}>
                Topic: <b>{topic}</b>
                {difficulty ? <> | Difficulty: <b>{difficulty}</b></> : <> | Difficulty: <b>Any</b></>}
              </p>
            )}
            {elapsed >= 60 && elapsed < 120 && (
              <p style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}>
                Topic: <b>{topic}</b> | Difficulty: <b>Any</b>
              </p>
            )}

            <button
              onClick={onCancel}
              disabled={isRedirecting}
              style={{
                ...styles.cancelButton,
                opacity: isRedirecting ? 0.5 : 1,
                cursor: isRedirecting ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default MatchmakingOverlay;
