import api from "./axiosInstance";
import type { Attempt } from "../types/attempt";

type AttemptsResponse = {
  message: string;
  data: Attempt[];
};

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL;

export async function fetchUserAttempts(
  userId: string,
  token: string,
): Promise<Attempt[]> {
  const response = await api.get<AttemptsResponse>(
    `${USER_SERVICE_URL}/users/${userId}/attempts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data.data ?? [];
}
