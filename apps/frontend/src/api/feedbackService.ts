import api from './axiosInstance';

const QUESTION_SERVICE_URL = import.meta.env.VITE_QUESTION_SERVICE_URL as string;

export const getMyFeedback = async () => {
  const response = await api.get(`${QUESTION_SERVICE_URL}/feedback`);
  return response.data;
};

export const getAllFeedback = async (params?: {
  status?: string;
  category?: string;
  questionId?: string;
}) => {
  const response = await api.get(`${QUESTION_SERVICE_URL}/feedback`, { params });
  return response.data;
};

export const submitFeedback = async (body: {
  questionId: string;
  category: string;
  comment: string;
}) => {
  const response = await api.post(`${QUESTION_SERVICE_URL}/feedback`, body);
  return response.data;
};

export const getMyOwnFeedback = async () => {
  const response = await api.get(`${QUESTION_SERVICE_URL}/feedback/my`);
  return response.data;
};

export const updateFeedback = async (
  id: string,
  body: { status?: string; adminNote?: string },
) => {
  const response = await api.patch(`${QUESTION_SERVICE_URL}/feedback/${id}`, body);
  return response.data;
};

export const deleteFeedback = async (id: string) => {
  const response = await api.delete(`${QUESTION_SERVICE_URL}/feedback/${id}`);
  return response.data;
};
