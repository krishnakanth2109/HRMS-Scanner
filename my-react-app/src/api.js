import axios from "axios";

// UPDATED: Reads from .env (VITE_API_URL) with a local fallback
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_URL = `${BASE_URL}/attendance`;

export const getAttendance = async (employeeId) => {
  const res = await axios.get(`${API_URL}/${employeeId}`);
  return res.data;
};

export const punchIn = async (data) => {
  const res = await axios.post(`${API_URL}/punch-in`, data);
  return res.data;
};

export const punchOut = async (data) => {
  const res = await axios.post(`${API_URL}/punch-out`, data);
  return res.data;
};