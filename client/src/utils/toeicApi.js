// src/utils/toeicApi.js
import apiRequest from "./apiRequest";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";

export const getToeicSets = () =>
  apiRequest.get("/toeic/sets").then((res) => res.data.items);

export const getToeicSet = (id) =>
  apiRequest.get(`/toeic/sets/${id}`).then((res) => res.data.data);

export const createToeicAttempt = (id, payload) =>
  apiRequest
    .post(`/toeic/sets/${id}/attempts`, payload)
    .then((res) => res.data);

/**
 * Lấy câu hỏi theo từng part (đang dùng cho mode luyện từng part)
 * GET /toeic/sets/:setId/questions?part=p1
 */
export const getToeicQuestions = async (setId, partKey) => {
  const res = await axios.get(`${API_BASE}/toeic/sets/${setId}/questions`, {
    params: { part: partKey },
  });
  if (!res.data.ok) throw new Error(res.data.msg || "Không tải được câu hỏi");
  return res.data.data || [];
};

/**
 * Lấy TOÀN BỘ câu hỏi của 1 set (dùng cho FULLTEST)
 * GET /toeic/sets/:setId/questions
 */
export const getToeicQuestionsOfSet = async (setId) => {
  const res = await axios.get(`${API_BASE}/toeic/sets/${setId}/questions`, {
    withCredentials: true, // gửi cookie nếu cần kiểm tra login/premium
  });

  if (!res.data.ok) {
    throw new Error(res.data.msg || "Không tải được câu hỏi");
  }

  return res.data.data || [];
};

/**
 * Lấy thông tin attempt (setId, selectedParts, timeLimitSec, ...)
 * GET /toeic/attempts/:attemptId
 */
export const getToeicAttempt = async (attemptId) => {
  const res = await axios.get(`${API_BASE}/toeic/attempts/${attemptId}`, {
    withCredentials: true, // để gửi cookie token
  });

  if (!res.data.ok) {
    throw new Error(res.data.msg || "Không tải được attempt");
  }

  return res.data.data; // { id, setId, setTitle, selectedParts, timeLimitSec, ... }
};

// alias cho tiện import ở chỗ khác (nếu muốn dùng tên rõ hơn)
export const getToeicAttemptDetail = getToeicAttempt;

export const submitToeicAttempt = async (attemptId, answers) => {
  const res = await apiRequest.post(`/toeic/attempts/${attemptId}/submit`, {
    answers, // [{ questionId, selectedOption }]
  });

  return res.data; // { ok, data }
};

export const getToeicLastResult = async (setId) => {
  const res = await apiRequest.get(`/toeic/sets/${setId}/last-attempt`);
  // res.data: { ok, data }
  return res.data;
};

// ==================== WRITING ====================

/** Danh sách đề Writing (dùng cho trang Practice Writing) */
export const listWritingSets = async () => {
  const res = await apiRequest.get("/toeic-writing/sets");
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Lỗi lấy danh sách đề writing");
  return data.items || [];
};

/** Chi tiết 1 đề Writing */
export const getWritingSet = async (id) => {
  const res = await apiRequest.get(`/toeic-writing/sets/${id}`);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Lỗi lấy đề writing");
  return data.data;
};

/** Tạo attempt writing (full test hoặc theo part) */
export const createWritingAttempt = async (setId, payload) => {
  // payload: { selectedParts?: ["w1_5","w6_7","w8"], timeLimitSec?: number }
  const res = await apiRequest.post(
    `/toeic-writing/sets/${setId}/attempts`,
    payload
  );
  return res.data; // { ok, attemptId }
};

/** Lấy thông tin attempt writing */
export const getWritingAttempt = async (attemptId) => {
  const res = await apiRequest.get(`/toeic-writing/attempts/${attemptId}`);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Không tải được attempt writing");
  return data.data;
};

/** Gửi bài viết (cả 8 câu) lên để AI chấm */
export const submitWritingAttempt = async (attemptId, answers) => {
  // answers: [{ questionId, answerText }]
  const res = await apiRequest.post(
    `/toeic-writing/attempts/${attemptId}/submit`,
    { answers }
  );
  return res.data; // { ok, data: { summary, answers, ... } }
};

export const submitToeicWritingAttempt = async (attemptId, answers) => {
  const res = await apiRequest.post(`/toeic-writing/attempts/${attemptId}/submit`, {
    answers,
  });

  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Nộp bài Writing thất bại");
  return data.data; // { attemptId, setId, summary, answers }
};

/** Lấy câu hỏi writing theo part (w1_5, w6_7, w8) */
export const getWritingQuestions = async (setId, partKey) => {
  const res = await apiRequest.get(`/toeic-writing/sets/${setId}/questions`, {
    params: { part: partKey },
  });
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Không tải được câu hỏi writing");
  return data.data || [];
};

/** Lấy toàn bộ câu hỏi writing của 1 đề (full test) */
export const getWritingQuestionsOfSet = async (setId) => {
  const res = await apiRequest.get(`/toeic-writing/sets/${setId}/questions`);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Không tải được câu hỏi writing");
  return data.data || [];
};

/** Lấy attempt writing gần nhất của user cho 1 đề */
export const getWritingLastAttempt = async (setId) => {
  try {
    const res = await apiRequest.get(
      `/toeic-writing/sets/${setId}/last-attempt`
    );
    const data = res.data;
    if (!data.ok) throw new Error(data.msg || "Lỗi lấy attempt gần nhất");
    return data.data; // có thể null
  } catch (err) {
    // chưa đăng nhập thì coi như chưa có attempt
    if (err?.response?.status === 401) return null;
    throw err;
  }
};

// GET /toeic/my/recent-attempts?days=30
export const getMyToeicRecentAttempts = async (days = 30) => {
  const res = await apiRequest.get(`/toeic/my/recent-attempts?days=${days}`);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Lỗi lấy lịch sử TOEIC");
  return data.items;
};

export const getMyWritingRecentAttempts = async (days = 30) => {
  const res = await apiRequest.get(
    `/toeic-writing/my/recent-attempts?days=${days}`
  );
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Lỗi lấy lịch sử Writing");
  return data.items;
};

export const getToeicAttemptReview = async (attemptId) => {
  const res = await apiRequest.get(`/toeic/attempts/${attemptId}/review`);
  return res.data;
};

export const getWritingAttemptReview = async (attemptId) => {
  const res = await apiRequest.get(`/toeic-writing/attempts/${attemptId}/review`);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg);
  return data.data;
};
