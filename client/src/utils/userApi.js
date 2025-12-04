import apiRequest from "./apiRequest";

// Cập nhật tên
export const updateProfile = (payload) => {
  return apiRequest.patch("/user/profile", payload);
};

// Upload avatar
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append("avatar", file);

  return apiRequest.post("/user/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Đổi mật khẩu
export const changePassword = (payload) => {
  return apiRequest.post("/user/change-password", payload);
};
