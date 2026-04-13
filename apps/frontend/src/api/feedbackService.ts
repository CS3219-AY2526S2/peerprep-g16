import api from './axiosInstance';

export const getMyFeedback = async () => {
  const response = await api.get('http://localhost:3002/feedback');
  return response.data;
};

export const getAllFeedback = async (params?: {
  status?: string;
  category?: string;
  questionId?: string;
}) => {
  const response = await api.get('http://localhost:3002/feedback', { params });
  return response.data;
};

export const submitFeedback = async (body: {
  questionId: string;
  category: string;
  comment: string;
}) => {
  const response = await api.post('http://localhost:3002/feedback', body);
  return response.data;
};

export const getMyOwnFeedback = async () => {
  const response = await api.get('http://localhost:3002/feedback/my');
  return response.data;
};

export const updateFeedback = async (
  id: string,
  body: { status?: string; adminNote?: string },
) => {
  const response = await api.patch(`[http://localhost:3002/feedback/](http://localhost:3002/feedback/)\${id}`, body);
  return response.data;
};

export const deleteFeedback = async (id: string) => {
  const response = await api.delete(`[http://localhost:3002/feedback/](http://localhost:3002/feedback/)\${id}`);
  return response.data;
};
