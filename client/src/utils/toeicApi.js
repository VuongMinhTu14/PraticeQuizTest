import apiRequest from "./apiRequest";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";

export const getToeicSets = () =>
  apiRequest.get("/toeic/sets").then((res) => res.data.items);

export const getToeicSet = (id) =>
  apiRequest.get(`/toeic/sets/${id}`).then((res) => res.data.data);

export const createToeicAttempt = (id, payload) =>
  apiRequest.post(`/toeic/sets/${id}/attempts`, payload).then((res) => res.data);

export const getToeicQuestions = async (setId, partKey) => {
  const res = await axios.get(
    `${API_BASE}/toeic/sets/${setId}/questions`,
    { params: { part: partKey } }
  );
  if (!res.data.ok) throw new Error(res.data.msg || "Không tải được câu hỏi");
  return res.data.data || [];
};

export const getToeicAttempt = async (attemptId) => {
  const res = await axios.get(`${API_BASE}/toeic/attempts/${attemptId}`, {
    withCredentials: true, // để gửi cookie token
  });

  if (!res.data.ok) {
    throw new Error(res.data.msg || "Không tải được attempt");
  }

  return res.data.data; // { id, setId, setTitle, selectedParts, timeLimitSec, ... }
};