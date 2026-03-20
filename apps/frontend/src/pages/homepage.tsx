import React from "react";
import webStyles from "../components/styles";

function Homepage() {
    const stored = localStorage.getItem("login");
    const [topic, setTopic] = React.useState("");
    const [difficulty, setDifficulty] = React.useState("");
    const [language, setLanguage] = React.useState("");
    const [error, setError] = React.useState(false);

    const handleMatchmake = () => {
        if (!topic) {
            setError(true);
            return;
        }
        setError(false);
        // matchmaking logic here
        console.log("Matchmaking with:", { topic, difficulty, language });
    };

    return (
        <>
            <div style={{ display: "flex", marginTop: "60px" }}>
                <h3 style={styles.heading}>Main Page</h3>
            </div>
            <div style={styles.sectionTitle}>
                <div style={styles.filtersRow}>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>
                            Topic: <span style={{ color: "red" }}>*</span>
                        </label>
                        <select
                            value={topic}
                            onChange={e => { setTopic(e.target.value); setError(false); }}
                            style={styles.select}
                        >
                            <option value="">Select...</option>
                            <option value="String">String</option>
                            <option value="Numbers">Numbers</option>
                            <option value="Assays">Assays</option>
                            <option value="List">List</option>
                        </select>
                        <p style={styles.important}>* is required</p>
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Difficulty:</label>
                        <select
                            value={difficulty}
                            onChange={e => setDifficulty(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">Select...</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Preferred Coding Language:</label>
                        <select
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">Select...</option>
                            <option value="Python">Python</option>
                            <option value="Java">Java</option>
                            <option value="JavaScript">JavaScript</option>
                            <option value="C++">C++</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleMatchmake} style={styles.matchmakeButton}>
                    Matchmake
                </button>
            </div>
        </>
    );
}

const styles = webStyles;

export default Homepage