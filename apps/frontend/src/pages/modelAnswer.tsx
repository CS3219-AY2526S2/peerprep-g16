import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/axiosInstance";
import styles from "../components/styles";

const QUESTION_SERVICE_URL = import.meta.env.VITE_QUESTION_SERVICE_URL as string;

function ModelAnswer() {
    const { questionId } = useParams<{ questionId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<{
        modelAnswer: string;
        modelAnswerTimeComplexity: string;
        modelAnswerExplanation: string;
    } | null>(null);
    const [questionDescription, setQuestionDescription] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!questionId) {
            navigate("/homepage", { replace: true });
            return;
        }
        const loadModelAnswer = async () => {
            try {
                const res = await api.get(`${QUESTION_SERVICE_URL}/questions/${questionId}/model-answer`);
                setData(res.data);
            } catch {
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        const loadQuestionDescription = async () => {
            try {
                const res = await api.get(`${QUESTION_SERVICE_URL}/questions/${questionId}/description`);
                setQuestionDescription(res.data.description);
            } catch {
                setQuestionDescription(null);
            }
        };
        loadModelAnswer();
        loadQuestionDescription();
    }, [questionId, navigate]);

    if (loading) return <div style={styles.page}>Loading...</div>;
    if (!data) return <div style={styles.page}>Model answer unavailable.</div>;

    return (
        <div style={styles.page}>

            <h2>Model Answer</h2>

            <h3 style={styles.sectionTitle}>Question:</h3>
            <p>{questionDescription}</p>

            <h3 style={styles.sectionTitle}>Answer:</h3>
            <p>{data.modelAnswer}</p>

            <h3 style={styles.sectionTitle}>Time Complexity:</h3>
            <p>{data.modelAnswerTimeComplexity}</p>

            <h3 style={styles.sectionTitle}>Explanation:</h3>
            <p>{data.modelAnswerExplanation}</p>
        </div>
    );
}

export default ModelAnswer;