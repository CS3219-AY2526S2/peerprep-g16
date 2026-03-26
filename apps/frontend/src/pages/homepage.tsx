import React, { useEffect, useState, useRef } from "react";
import webStyles from "../components/styles";
import api from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

function Homepage() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [error, setError] = useState(false);
    const [isMatchmaking, setIsMatchmaking] = useState(false);
    const [matchStatus, setMatchStatus] = useState("Searching for a match...");
    const [elapsed, setElapsed] = useState(0);
    const [isTimeout, setIsTimeout] = useState(false);

    const pollRef = useRef<any>(null);
    const timerRef = useRef<any>(null);
    const hasStartedRef = useRef(false);
    const isMatchedRef = useRef(false);

    const stopAll = () => {
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        pollRef.current = null;
        timerRef.current = null;
    };

    const handleMatchmake = () => {
        if (!topic) { setError(true); return; }
        hasStartedRef.current = false;
        isMatchedRef.current = false;
        setIsMatchmaking(true);
        setElapsed(0);
        setMatchStatus("Searching for a match...");
        setIsTimeout(false);
    };

    useEffect(() => {
        if (!isMatchmaking || isTimeout || hasStartedRef.current) return;
        hasStartedRef.current = true;

        const stored = localStorage.getItem("login");
        const user = stored ? JSON.parse(stored) : null;
        if (!user) return;

        timerRef.current = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);

        const start = async () => {
            try {
                const response = await api.post("http://localhost:3004/api/match", {
                    userId: user.id,
                    username: user.username,
                    topic,
                    difficulty: difficulty.toLowerCase(),
                });

                if (response.data.status === 'already_in_queue' ||
                    response.data.status === 'waiting') {
                    startPolling(user.id);
                    return;
                }

                if (response.data.status === 'already_matched') {
                    const statusResponse = await api.get(`http://localhost:3004/api/match/${user.id}`);
                    if (statusResponse.data.status === 'matched') {
                        handleMatchFound(statusResponse.data);
                        return;
                    }
                    startPolling(user.id);
                    return;
                }

            } catch (err) {
                console.error(err);
                stopAll();
                setIsMatchmaking(false);
            }
        };

        start();

        return () => stopAll();
    }, [isMatchmaking]);

    const handleMatchFound = (data: any) => {
        if (isMatchedRef.current) return; // prevent double-firing
        isMatchedRef.current = true;
        stopAll();
        setMatchStatus("Match found! Redirecting...");
        setTimeout(() => {
            setIsMatchmaking(false);
            navigate(`/collaboration/${data.roomId}`);
        }, 1500);
    };

    const cancelMatchmaking = async () => {
        stopAll();
        hasStartedRef.current = false;
        isMatchedRef.current = false;
        setIsMatchmaking(false);
        setElapsed(0);
        setIsTimeout(false);

        const stored = localStorage.getItem("login");
        const user = stored ? JSON.parse(stored) : null;
        if (user) {
            try {
                await api.delete(`http://localhost:3004/api/match/${user.id}`);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const startPolling = (userId: string) => {
        pollRef.current = setInterval(async () => {
            if (isMatchedRef.current) {
                clearInterval(pollRef.current);
                return;
            }
            try {
                const statusResponse = await api.get(`http://localhost:3004/api/match/${userId}`);

                if (statusResponse.data.status === "matched") {
                    handleMatchFound(statusResponse.data);
                } else if (statusResponse.data.status === "expand_search_difficulty") {
                    setMatchStatus(statusResponse.data.message);
                } else if (statusResponse.data.status === "timeout") {
                    stopAll();
                    setMatchStatus("No match found. Please try again later.");
                    setIsTimeout(true);
                } else if (statusResponse.data.status === "waiting") {
                    setMatchStatus(statusResponse.data.message);
                }
            } catch (err) {
                console.error(err);
            }
        }, 1000);
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
                            <option value="Random">Random</option>
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
                        </select>                    </div>
                </div>

                <button onClick={handleMatchmake} style={styles.matchmakeButton}>
                    Matchmake
                </button>

                {isMatchmaking && (
                    <div style={overlayStyles.overlay}>
                        <div style={overlayStyles.box}>
                            {isTimeout ? (
                                <>
                                    <h3 style={{ marginBottom: "10px", color: "red" }}>No Match Found</h3>
                                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
                                        Sorry, there are no available matches at the moment. Please try again later.
                                    </p>
                                    <button onClick={() => {
                                        setIsMatchmaking(false);
                                        setIsTimeout(false);
                                        setElapsed(0);
                                    }} style={overlayStyles.acceptButton}>
                                        OK
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div style={overlayStyles.spinner} />
                                    <h3 style={{ marginBottom: "10px" }}>{matchStatus}</h3>
                                    <p style={{ fontSize: "16px", color: "#666", marginBottom: "8px" }}>
                                        Time elapsed: <span style={{ fontWeight: "bold", color: "#333" }}>
                                            {Math.floor(elapsed / 60).toString().padStart(2, "0")}:
                                            {(elapsed % 60).toString().padStart(2, "0")}
                                        </span>
                                    </p>
                                    {elapsed < 60 && (  // less than 1 minute
                                        <p style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}>
                                            Topic: <b>{topic}</b>
                                            {difficulty ? <> | Difficulty: <b>{difficulty}</b></> : <> | Difficulty: <b>Any</b></>}
                                        </p>
                                    )}
                                    {elapsed >= 60 && elapsed < 120 && (  // 1-2 minutes
                                        <p style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}>
                                            Topic: <b>{topic}</b>
                                            <> | Difficulty: <b>Any</b></>                                        </p>
                                    )}
                                    <button onClick={cancelMatchmaking} style={overlayStyles.cancelButton}>
                                        Cancel
                                    </button>
                                </>
                            )
                            }
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

const styles = webStyles;

const overlayStyles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    box: {
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "12px",
        width: "400px",
        textAlign: "center",
        boxShadow: "0px 4px 20px rgba(0,0,0,0.2)",
    },
    spinner: {
        width: "50px",
        height: "50px",
        border: "5px solid #f0f0f0",
        borderTop: "5px solid #007BFF",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        margin: "0 auto 20px auto",
    },
    cancelButton: {
        padding: "10px 30px",
        backgroundColor: "white",
        border: "2px solid red",
        borderRadius: "20px",
        color: "red",
        fontWeight: "bold",
        fontSize: "15px",
        cursor: "pointer",
    },
    acceptButton: {
        padding: "10px 30px",
        backgroundColor: "#007BFF",
        border: "none",
        borderRadius: "20px",
        color: "white",
        fontWeight: "bold",
        fontSize: "15px",
        cursor: "pointer",
    },
};

export default Homepage