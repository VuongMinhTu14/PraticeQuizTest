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
  const res = await api.get("/toeic/admin/sets");
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
export const getToeicQuestionsAdmin = async (setId, partKey) => {
  const res = await api.get(`/toeic/admin/sets/${setId}/questions`, {
    params: { partKey },
  });
  if (!res.data.ok) throw new Error(res.data.msg || "Load questions fail");
  return res.data.data;
};

export const importToeicQuestionsAdmin = async (setId, partKey, questions) => {
  const res = await api.post(
    `/toeic/admin/sets/${setId}/questions/import`,
    { partKey, questions }
  );
  if (!res.data.ok) throw new Error(res.data.msg || "Import fail");
  return res.data;
};

export const deleteToeicQuestionAdmin = async (id) => {
  const res = await api.delete(`/toeic/admin/questions/${id}`);
  if (!res.data.ok) throw new Error(res.data.msg || "Delete question fail");
  return res.data;
};

export const createToeicQuestionAdmin = async (setId, partKey, payload) => {
  const res = await api.post(`/toeic/admin/sets/${setId}/questions`, {
    partKey,
    ...payload,
  });
  if (!res.data.ok) {
    throw new Error(res.data.msg || "Create question fail");
  }
  return res.data;
};

// ===== TOEIC WRITING SETS (ADMIN) =====
export const adminListWritingSets = async () => {
  const res = await api.get("/toeic-writing/admin/sets");
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Lỗi lấy danh sách đề writing");
  return data.items;
};

export const adminCreateWritingSet = async (payload) => {
  const res = await api.post("/toeic-writing/admin/sets", payload);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Tạo đề writing thất bại");
  return data.data;
};

export const adminUpdateWritingSet = async (id, payload) => {
  const res = await api.put(`/toeic-writing/admin/sets/${id}`, payload);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Cập nhật đề writing thất bại");
  return data.data;
};

export const adminDeleteWritingSet = async (id) => {
  const res = await api.delete(`/toeic-writing/admin/sets/${id}`);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Xoá đề writing thất bại");
  return true;
};

// ===== TOEIC WRITING QUESTIONS (ADMIN) =====
export const adminGetWritingQuestions = async (setId, partKey) => {
  const res = await api.get(
    `/toeic-writing/admin/sets/${setId}/questions`,
    { params: { partKey } }
  );
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Lỗi lấy câu hỏi writing");
  // controller trả về { ok, data: [...] }
  return data.data;
};

export const adminCreateWritingQuestion = async (setId, partKey, payload) => {
  const res = await api.post(
    `/toeic-writing/admin/sets/${setId}/questions`,
    { partKey, ...payload }
  );
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Lỗi tạo câu hỏi writing");
  return data.data;
};

export const adminImportWritingQuestions = async (
  setId,
  partKey,
  questions
) => {
  const res = await api.post(
    `/toeic-writing/admin/sets/${setId}/questions/import`,
    { partKey, questions }
  );
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Import câu hỏi writing lỗi");
  return data.data;
};

export const adminDeleteWritingQuestion = async (id) => {
  const res = await api.delete(`/toeic-writing/admin/questions/${id}`);
  const data = res.data;
  if (!data.ok) throw new Error(data.msg || "Xoá câu hỏi writing thất bại");
  return true;
};

export const adminUploadWritingQuestionImage = async (questionId, file) => {
  const formData = new FormData();
  formData.append("file", file); // backend nhận field "file"
  const res = await api.post(
    `/toeic-writing/admin/questions/${questionId}/upload-image`,
    formData
  );
  return res.data;
};

// ===== TOEIC MEDIA (L&R) =====
export const uploadToeicQuestionImageAdmin = async (questionId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    `/toeic/admin/questions/${questionId}/upload-image`,
    formData
  );
  return res.data;
};

export const uploadToeicQuestionAudioAdmin = async (questionId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    `/toeic/admin/questions/${questionId}/upload-audio`,
    formData
  );
  return res.data;
};
