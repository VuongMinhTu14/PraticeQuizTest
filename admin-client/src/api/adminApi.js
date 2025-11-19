import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// key lưu trong localStorage
const TOKEN_KEY = "pq_admin_token";
const USER_KEY = "pq_admin_user";

// khởi tạo token nếu đã có
const savedToken = localStorage.getItem(TOKEN_KEY);
if (savedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
}

// ===== AUTH =====
export const loginAdmin = async (email, password) => {
  const res = await api.post("/user/login", { email, password });
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Login fail");

  const { user, token } = data;

  // CHỈ CHO ROLE ADMIN
  if (user.role !== "admin") {
    throw new Error("Tài khoản này không có quyền quản trị (role admin).");
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  api.defaults.headers.common.Authorization = `Bearer ${token}`;

  return user;
};

export const getMe = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const logoutAdmin = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete api.defaults.headers.common.Authorization;
};

// ===== USERS =====
export const getUsers = async () => {
  const res = await api.get("/admin/users");
  if (!res.data.ok) throw new Error(res.data.msg || "Load users fail");
  return res.data.data;
};

export const resetUserPoints = async (userId) => {
  const res = await api.post(`/admin/users/${userId}/reset-points`);
  if (!res.data.ok) throw new Error(res.data.msg || "Reset fail");
  return res.data;
};

export const deleteUser = async (userId) => {
  const res = await api.delete(`/admin/users/${userId}`);
  if (!res.data.ok) throw new Error(res.data.msg || "Delete fail");
  return res.data;
};

// ===== TOEIC SETS (ADMIN) =====
export const getToeicSetsAdmin = async () => {
  const res = await api.get("/toeic/admin/sets");   // 👈 /toeic/admin/sets
  if (!res.data.ok) throw new Error(res.data.msg || "Load sets fail");
  return res.data.data;
};

export const createToeicSetAdmin = async (payload) => {
  const res = await api.post("/toeic/admin/sets", payload);
  if (!res.data.ok) throw new Error(res.data.msg || "Create set fail");
  return res.data.data;
};

export const updateToeicSetAdmin = async (id, payload) => {
  const res = await api.put(`/toeic/admin/sets/${id}`, payload);
  if (!res.data.ok) throw new Error(res.data.msg || "Update set fail");
  return res.data.data;
};

export const deleteToeicSetAdmin = async (id) => {
  const res = await api.delete(`/toeic/admin/sets/${id}`);
  if (!res.data.ok) throw new Error(res.data.msg || "Delete set fail");
  return res.data;
};

// ===== TOEIC QUESTIONS (ADMIN) =====

// list câu hỏi theo set + part
// -> GET /toeic/admin/sets/:setId/questions?partKey=p3
export const getToeicQuestionsAdmin = async (setId, partKey) => {
  const params = partKey ? { partKey } : undefined;
  const res = await api.get(`/toeic/admin/sets/${setId}/questions`, {
    params: { partKey },
  });
  if (!res.data.ok) throw new Error(res.data.msg || "Load questions fail");
  return res.data.data;
};

// import câu hỏi: POST /toeic/admin/sets/:setId/questions/import
export const importToeicQuestionsAdmin = async (setId, partKey, questions) => {
  const res = await api.post(
    `/toeic/admin/sets/${setId}/questions/import`,
    { partKey, questions }
  );
  if (!res.data.ok) throw new Error(res.data.msg || "Import fail");
  return res.data;
};

// xoá 1 câu hỏi: DELETE /toeic/admin/questions/:id
export const deleteToeicQuestionAdmin = async (id) => {
  const res = await api.delete(`/toeic/admin/questions/${id}`);
  if (!res.data.ok) throw new Error(res.data.msg || "Delete question fail");
  return res.data;
};

export const createToeicQuestionAdmin = async (setId, partKey, payload) => {
  // payload: { number, questionText, choices, correctOption, ... }
  const res = await api.post(`/toeic/admin/sets/${setId}/questions`, {
    partKey,
    ...payload,
  });

  if (!res.data.ok) {
    throw new Error(res.data.msg || "Create question fail");
  }
  return res.data;
};

