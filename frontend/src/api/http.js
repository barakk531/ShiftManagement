
// src/api/http.js
import axios from "axios";
import { getAuthToken } from "../util/auth";

const http = axios.create({
baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && token !== "EXPIRED") {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("expiration");
    }
    return Promise.reject(error);
  }
);

export default http;
