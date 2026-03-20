import React from "react";

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

const styles = {
    container: {
        marginTop: "100px",
        textAlign: "center" as const,
        maxWidth: "280px",
        marginLeft: "auto",
        marginRight: "auto",
    },
    heading: {
        fontSize: "24px",
        color: "#333",
        margin: "20px 0 20px 20px"
    },

    important: {
        fontSize: "16px",
        color: "red",
        marginTop: "0",
        textAlign: "left" as const,

    },
    input: {
        marginBottom: "5px",
        borderRadius: "10px",
        width: "250px",
        padding: "12px",
    },
    label: {
        marginBottom: "5px",
        textAlign: "left" as const,
        display: "block",
        width: "250px",
    },
    form: {
        maxWidth: "300px",
        margin: "0 auto",
    },

    button: {
        width: "auto",
        padding: "10px",
        backgroundColor: "#007BFF",
        color: "white",
        border: "none",
        cursor: "pointer",
        marginBottom: "10px",
    },
    link: {
        textDecoration: "none",
        color: "#007BFF",
    },
    page: {
        marginTop: "80px",
        padding: "30px 40px",
    },

    sectionTitle: {
        fontSize: "18px",
        fontWeight: "bold" as const,
        marginBottom: "20px",
        marginLeft: "20px",
        marginRight: "20px",
        align: "Left",
    },
    filtersRow: {
        display: "flex",
        gap: "40px",
        alignItems: "flex-start",
        marginBottom: "30px",
        justifyContent: "space-between",
    },
    filterGroup: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "8px",
        flex: 1,
    },
    filterLabel: {
        fontSize: "16px",
        fontWeight: "bold" as const,
        textAlign: "left" as const,
        display: "block" as const,
    },
    select: {
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid #ccc",
        fontSize: "15px",
        width: "100%",
        backgroundColor: "white",
        cursor: "pointer",
    },
    matchmakeButton: {
        padding: "10px 20px",
        backgroundColor: "white",
        border: "2px solid #333",
        borderRadius: "20px",
        fontWeight: "bold" as const,
        fontSize: "15px",
        cursor: "pointer",
    },

};

export default Homepage