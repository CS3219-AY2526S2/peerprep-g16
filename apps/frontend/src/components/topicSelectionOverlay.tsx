import React from "react";
import styles from "./styles";

interface Props {
  selected: boolean;
  onDismiss: () => void;
}

function TopicSelectionOverlay({ selected, onDismiss }: Props) {
  if (!selected) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        <p style={{ color: "red", fontWeight: "bold" }}>Topic Required</p>
        <p>Please select a topic before matchmaking.</p>
        <button onClick={onDismiss} style={styles.acceptButton}>
          OK
        </button>
      </div>
    </div>
  );
}

export default TopicSelectionOverlay;