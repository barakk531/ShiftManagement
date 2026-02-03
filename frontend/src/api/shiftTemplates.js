import axios from "axios";
import { getAuthToken } from "../util/auth";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080",
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function listShiftTemplates() {
  const res = await api.get("/shift-templates");
  return res.data.templates;
}

export async function createShiftTemplate(payload) {
  const res = await api.post("/shift-templates", payload);
  return res.data.template;
}

export async function updateShiftTemplate(id, payload) {
  const res = await api.put(`/shift-templates/${id}`, payload);
  return res.data.template;
}

export async function deleteShiftTemplate(id) {
  const res = await api.delete(`/shift-templates/${id}`);
  return res.data;
}
