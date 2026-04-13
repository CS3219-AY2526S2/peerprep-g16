import React, { useEffect, useState, useRef } from "react";
import styles from "../components/styles";
import api from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import MatchmakingOverlay from "../components/matchmakingOverlay";
import TopicSelectionOverlay from "../components/topicSelectionOverlay";

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL as string;
const QUESTION_SERVICE_URL = import.meta.env.VITE_QUESTION_SERVICE_URL as string;
const MATCHING_SERVICE_URL = import.meta.env.VITE_MATCHING_SERVICE_URL as string;

function Homepage() {
    const navigate = useNavigate();
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [error, setError] = useState(false);
    const [isMatchmaking, setIsMatchmaking] = useState(false);
    const [matchStatus, setMatchStatus] = useState("Searching for a match...");
    const [elapsed, setElapsed] = useState(0);
    const [isTimeout, setIsTimeout] = useState(false);
    const [topics, setTopics] = useState<string[]>([]);
    const [topicsLoading, setTopicsLoading] = useState(true);


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

    const handleMatchmake = async () => {
        if (!topic) { setError(true); return; }

        try {
            await api.get(`${USER_SERVICE_URL}/auth/verify-token`);
        } catch {
            return; // interceptor handles PRIVILEGE_CHANGED
        }

        const stored = localStorage.getItem("login");
        const user = stored ? JSON.parse(stored) : null;
        if (user?.isAdmin) {
            window.alert("Your account privilege has changed. Please log in again.");
            localStorage.removeItem("login");
            navigate("/");
            return;
        }

        hasStartedRef.current = false;
        isMatchedRef.current = false;
        setIsMatchmaking(true);
        setElapsed(0);
        setMatchStatus("Searching for a match...");
        setIsTimeout(false);
    };

    //get topics from the database for the dropdown menu
    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const response = await api.get(`${QUESTION_SERVICE_URL}/questions/topics`);
                setTopics(response.data.topics);
            } catch (err) {
                console.error("Failed to fetch topics", err);
            } finally {
                setTopicsLoading(false);
            }
        };

        fetchTopics();
    }, []);

    // Check on page load if user is already in queue
    useEffect(() => {
        const stored = localStorage.getItem("login");
        const user = stored ? JSON.parse(stored) : null;
        if (!user) return;

        const checkExistingQueue = async () => {
            try {
                const response = await api.get(`${MATCHING_SERVICE_URL}/api/match/${user.id}`);

                if (response.data.status === 'matched') {
                    // Already matched before they refreshed
                    handleMatchFound(response.data);
                } else if (response.data.status === 'waiting' ||
                    response.data.status === 'expand_search_difficulty') {
                    // Still in queue — restore the overlay
                    const userData = response.data.preferences;
                    if (userData?.topic) setTopic(userData.topic);
                    if (userData?.difficulty) setDifficulty(userData.difficulty);
                    setIsMatchmaking(true);
                    setMatchStatus(response.data.message || "Searching for a match...");
                    hasStartedRef.current = true; // prevent useEffect re-joining
                    startPolling(user.id);
                    // Restore elapsed time if available
                    if (response.data.elapsed) {
                        setElapsed(Math.floor(response.data.elapsed / 1000));
                        timerRef.current = setInterval(() => {
                            setElapsed(prev => prev + 1);
                        }, 1000);
                    }
                }
                // status === 'not_in_queue' → do nothing, normal page load
            } catch (err) {
                console.error('Failed to check queue status on mount', err);
            }
        };

        checkExistingQueue();
    }, []);

    //matchmaking 
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
                const response = await api.post(`${MATCHING_SERVICE_URL}/api/match`, {
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
                    const statusResponse = await api.get(`${MATCHING_SERVICE_URL}/api/match/${user.id}`);
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
        if (data.matchedWith?.username) {
            localStorage.setItem(`peer:${data.roomId}`, data.matchedWith.username);
        }
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
                await api.delete(`${MATCHING_SERVICE_URL}/api/match/${user.id}`);
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
                const statusResponse = await api.get(`${MATCHING_SERVICE_URL}/api/match/${userId}`);

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
                            Topic: <span style={styles.important}>*</span>
                        </label>
                        <select
                            value={topic}
                            onChange={e => { setTopic(e.target.value); setError(false); }}
                            style={styles.select}
                            disabled={topicsLoading}
                        >
                            {topicsLoading && (
                                <option>Loading topics...</option>
                            )}

                            {!topicsLoading && topics.length === 0 && (
                                <option disabled>Failed to load topics</option>
                            )}

                            {!topicsLoading && topics.length > 0 && (
                                <>
                                    <option value="">Select...</option>
                                    <option value="Random">Random</option>
                                    {topics.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </>
                            )}
                        </select>
                        <p style={styles.important}>Note: <span style={styles.normalText}>Topic is required and if difficulty is not selected, it will be set as random.</span> </p>
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
                    <MatchmakingOverlay
                        isTimeout={isTimeout}
                        matchStatus={matchStatus}
                        elapsed={elapsed}
                        topic={topic}
                        difficulty={difficulty}
                        onCancel={cancelMatchmaking}
                        onDismiss={() => {
                            setIsMatchmaking(false);
                            setIsTimeout(false);
                            setElapsed(0);
                        }}
                    />
                )}

                {error && (
                    <TopicSelectionOverlay
                        selected={error}
                        onDismiss={() => setError(false)}
                    />
                )}
            </div>
        </>
    );
}

export default Homepage