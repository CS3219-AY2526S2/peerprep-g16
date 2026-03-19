import axios from "axios";

const api = axios.create();

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const stored = localStorage.getItem("login");
      const { refreshToken } = stored ? JSON.parse(stored) : {};

      if (!refreshToken) {
        localStorage.removeItem("login");
        window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post("http://localhost:3001/auth/refresh", {
          refreshToken,
        });

        const newAccessToken = res.data.data.accessToken;

        localStorage.setItem("login", JSON.stringify({
          ...JSON.parse(localStorage.getItem("login")!),
          token: newAccessToken,
        }));

        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (err) {
        localStorage.removeItem("login");
        window.location.href = "/";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;