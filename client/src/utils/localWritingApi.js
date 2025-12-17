import axios from "axios";

const LOCAL_WRITING_URL =
  import.meta.env.VITE_LOCAL_WRITING_URL || "http://localhost:3001/local-writing-score";

/**
 * Gọi dịch vụ chấm offline (Ollama local).
 * @param {Object} payload { answerText, questionText }
 */
export const scoreWritingLocal = async (payload) => {
  const res = await axios.post(LOCAL_WRITING_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
};

