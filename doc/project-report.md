# Báo Cáo Dự Án PracticeQuiz (2025-12-12)

## Tổng quan
- Kiến trúc nhiều gói: `admin-client` (React + Ant Design + Vite), `client` (React + Vite + React Query + Zustand), `server` (Express + MongoDB + JWT + upload tệp + Gemini AI chấm Writing).
- Mặc định endpoint `http://localhost:11111` qua `VITE_API_ENDPOINT`; dùng cookie và header Authorization cho cả hai front-end.
- Upload tĩnh phục vụ từ `server/uploads`; chưa có CDN hoặc lưu trữ đối tượng.

## Admin Portal (`admin-client`)
- Đăng nhập: email/password gọi `/user/login`, lưu token vào `localStorage` (`pq_admin_token`); guard FE chỉ kiểm tra `role === "admin"` ở client.
- Điều hướng: Users, TOEIC Sets, TOEIC Questions, TOEIC Writing Sets, TOEIC Writing Questions.
- Users: danh sách, reset điểm, xóa user (`/admin/users`, `/admin/users/:id/reset-points`, `/admin/users/:id`).
- TOEIC sets: CRUD `_id` tùy chỉnh, title, durationSec, totalQuestions, isFree, status; bảng + modal form.
- TOEIC questions: lọc theo set/part; thêm 1 câu (choices + passage metadata), import CSV/JSON, xóa; upload ảnh (P1/6/7) và audio (P1-4) trên từng câu.
- Writing sets: hai UI (`ToeicWritingAdmin`, `ToeicSetWritingAdmin`) cho CRUD + import JSON/CSV; trường gồm prompt, instructions, giới hạn từ, tags, status.
- Writing questions: tải theo set/part (w1_5, w6_7, w8), import JSON/CSV, upload ảnh cho bài picture/email, xóa câu.

## Ứng dụng người học (`client`)
- Layout: `LeftBar` (menu, chuyển theme), `TopBar` (auth, điểm), theme lưu qua Zustand.
- Trang auth: login/register gọi `/user/login` & `/user/register`, lưu token trong store `pq-auth`.
- Dashboard: React Query + Ant Design Plots hiển thị attempt TOEIC/Writing 30 ngày gần nhất, bảng dẫn tới trang review.
- Practice TOEIC: danh sách đề, trang chi tiết luyện part hoặc full test, hiển thị kết quả gần nhất, tạo attempt với giới hạn thời gian tùy chọn.
- Trang làm bài TOEIC: tải meta attempt + câu hỏi, timer, tab part, render media (audio/ảnh), layout đọc hiểu có panel passage, chọn đáp án & nộp → result/review.
- Practice Writing: danh sách đề, chi tiết đề + kết quả gần nhất, tạo attempt (full/part), trang làm bài viết (prompt, ảnh, đếm từ) và nộp, trang review AI.
- Kết quả/review: trang result/review TOEIC và Writing lấy dữ liệu từ `/attempts/:id/review`.
- Profile: đổi username/avatar/password; xem lịch sử TOEIC/Writing; dùng lại `userApi` & `toeicApi`.
- Game route: placeholder.
- Tiện ích: `apiRequest` tự gắn header auth; `toeicApi`/`userApi` bọc các endpoint chính; React Query cache cho dashboard/profile.

## Backend (`server`)
- Express với CORS (localhost:5173/5174), parse JSON, cookie parser, `express-fileupload`, static `/uploads`.
- Routes:
  - `/user`: register, login, get me, update profile, upload avatar, change password (JWT qua `verifyToken`).
  - `/toeic`: sets/questions public; tạo/nộp attempt, last-attempt, recent attempts, review (cần auth); admin CRUD set/question, import, upload ảnh/audio.
  - `/toeic-writing`: sets/questions public; tạo/nộp attempt, last-attempt, recent attempts, review (cần auth); admin CRUD/import set & question, upload ảnh.
  - `/admin`: list/update/delete users. (Lưu ý: middleware đang comment nên chưa bảo vệ.)
- Middleware: `verifyToken` đọc `Authorization: Bearer <token>` và gắn `req.user`.
- Model dữ liệu:
  - `User`: displayName, username, email, hashedPassword, points, role, profileImage.
  - `ToeicSet`: parts (key/name/questions/tags/order/media), durationSec, totalQuestions, isFree, status, stats.
  - `ToeicQuestion`: choices, correctOption, media (imageUrl/audioUrl), passageId/order/text.
  - `ToeicAttempt`: selectedParts, answers, scoreByPart, totalQuestions/totalCorrect, scorePercent/raw, status/timestamps.
  - `ToeicWritingSet`: parts mặc định (w1_5, w6_7, w8), metadata (duration, tags, status, stats).
  - `ToeicWritingQuestion`: prompt/subPrompt/image, taskType, partKey, giới hạn từ, rubric/tags/groupKey.
  - `ToeicWritingAttempt`: answers kèm điểm AI chi tiết và summary.
- Utilities: `connectDB`, `seedToeic.js`, `writingGrader.js` gọi Gemini 2.5 Flash, map sang level TOEIC Writing.

## Quan sát & Rủi ro
- Admin routes chưa bật `verifyToken` → ai cũng có thể sửa sets/questions/users nếu API hở ra ngoài.
- Upload file cục bộ `/uploads` chưa có vòng đời/lưu trữ lâu dài; chưa có object storage/CDN.
- Validate input còn mỏng với CSV/JSON import và loại file media → nguy cơ dữ liệu lỗi.
- Một số chuỗi React bị lỗi mã hóa (UTF-8) có thể làm xấu UI copy.
- Chưa thấy rate limiting/monitoring/log tổng hợp; cần bổ sung để sẵn sàng production.
