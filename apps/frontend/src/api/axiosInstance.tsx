import axios from "axios";

const api = axios.create();

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("login");
  const token = stored ? JSON.parse(stored).token : "";
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (error.response?.data?.code === "PRIVILEGE_CHANGED") {
        localStorage.removeItem("login");
        window.dispatchEvent(new CustomEvent("privilegeChanged"));
        return Promise.reject(error);
      }

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
        const newRefreshToken = res.data.data.refreshToken;

        localStorage.setItem("login", JSON.stringify({
          ...JSON.parse(localStorage.getItem("login")!),
          token: newAccessToken,
          refreshToken: newRefreshToken,
        }));

        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (err: any) {
        if (err.response?.data?.code === "PRIVILEGE_CHANGED") {
          localStorage.removeItem("login");
          window.dispatchEvent(new CustomEvent("privilegeChanged"));
          return Promise.reject(err);
        }
        localStorage.removeItem("login");
        window.location.href = "/";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;