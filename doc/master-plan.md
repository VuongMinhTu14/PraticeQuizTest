# Master Plan (STDB) - PracticeQuiz

Giả định STDB = Situation, Target, Deliverables, Backlog.

## Situation
- Hai frontend React (admin-client, client) đã nối API Express/Mongo; luồng TOEIC MCQ và Writing (set, attempt, review) đã có.
- Chấm Writing dùng Gemini 2.5 Flash; chấm TOEIC ở server.
- Admin endpoint đang hở (chưa bật middleware); upload file nằm trên app server, chưa quản lý vòng đời.
- Import CSV/JSON cho câu hỏi & bài Writing nhưng thiếu validate/versioning mạnh.
- Quan sát/giám sát và test còn ít; một số chuỗi UI lỗi mã hóa.

## Target
- Ngắn hạn (0-4 tuần): khóa bề mặt admin, siết auth, ổn định luồng attempt/review, ép validation đầu vào.
- Trung hạn (1-2 tháng): chuẩn hóa pipeline media/AI, bổ sung analytics/monitoring, nâng UX luyện tập (review tools, tracking tiến độ).
- Dài hạn: quản trị nội dung (version, audit), sẵn sàng đa tenant, lưu trữ/CDN mở rộng cho media.

## Deliverables
- D1: Security & Access Control  
  Bật kiểm tra JWT/role cho admin, chuẩn hóa xử lý token (hết hạn/refresh), rate limiting cho các path nhạy cảm.
- D2: Content Pipeline & QA  
  Validate schema cho import CSV/JSON, thêm chế độ dry-run/preview, script seed cho dev, versioning câu hỏi/media.
- D3: Practice & Review Experience  
  Đồng nhất trang kết quả/review (MCQ + Writing), tăng khả năng resume/expire có kiểm soát, mượt mà điều hướng theo part.
- D4: AI Writing Reliability & Prediction  
  Hàng đợi + retry + cache + fallback quanh Gemini (chấm Writing), cảnh báo quota; bổ sung module dự đoán điểm thi L+R+W với endpoint và trang hiển thị riêng trong Practice.
- D5: Ops & Observability  
  Logging có cấu trúc, tracing/metrics, healthcheck, quản lý cấu hình môi trường, backup/restore cho Mongo + uploads.

## Backlog (ưu tiên khởi động)
1) Bật `verifyToken` + kiểm tra role cho router admin; thêm xử lý 401/403 trên admin-client.
2) Thêm validation (Joi/Zod) cho các endpoint tạo/sửa/import; từ chối CSV/JSON sai sớm.
3) Chuyển upload sang object storage (S3/GCS) với signed URL; giữ đường local cho dev.
4) Rate limiting + chống brute-force `/user/login` và route nhạy cảm khác.
5) Ổn định chấm Writing: thêm quota config, queue + retry + cache + fallback, health/alert quota (tham chiếu `doc/writing-score-plan.md`).
6) Module dự đoán điểm thi: chốt công thức baseline, service/endpoint `/prediction/my/latest`, trang FE dưới Practice (submenu), test dữ liệu mẫu (tham chiếu `doc/writing-score-plan.md`).
   - Đã tạo trang `/practice/prediction` và CSS riêng `prediction.css`.
7) Bổ sung test tích hợp luồng chính (register/login, tạo attempt, nộp MCQ, nộp Writing với AI mock).
8) Chuẩn hóa copy/mã hóa chuỗi ở cả hai client; xem xét pipeline i18n nếu cần song ngữ.
9) Gắn metrics + error logging cho dashboard/profile query và API; bổ sung endpoint status/health tối thiểu.
10) Tài liệu hóa biến môi trường (`JWT_SECRET`, `MONGO_URI`, `GEMINI_API_KEY`, cấu hình storage) và script khởi tạo.

## Hành động gấp cho admin (tiếp theo)
- Bật auth/role: cập nhật `verifyToken` gán `id,email,role`; thêm middleware `requireAdmin` kiểm tra `role === "admin"`.
- Route admin: áp `verifyToken`, `requireAdmin` cho `/admin/*`, `/toeic/admin/*`, `/toeic-writing/admin/*` (kể cả upload media).
- Trả lỗi chuẩn: JSON `{ ok:false, msg:"Cần quyền admin" }` (403) để admin-client hiển thị đúng.
- Đã làm: thêm audit admin (log update/delete/reset user), thêm trường `status` user; endpoint stats `/admin/stats/overview`; Admin FE có Dashboard (thẻ + mini bar), Users list filter/role/status/reset/xóa; thêm nút logout header.
- Đã làm FE/Review: trang kết quả/review TOEIC hiển thị điểm đúng/tổng, % chỉ phụ; thêm ước điểm Listening/Reading/Tổng (495/495/990) và ước điểm theo part; layout card gọn, không xuống dòng.

## Core Use Cases
- Người học đăng ký/đăng nhập, duyệt đề TOEIC, luyện theo part hoặc full test, nộp bài, xem kết quả & review chi tiết, theo dõi lịch sử ở Dashboard/Profile.
- Người học luyện Writing (w1_5, w6_7, w8), nộp câu trả lời tự do, nhận chấm/feedback AI, xem lại attempt cũ.
- Admin quản trị user (danh sách/reset điểm/xóa), quản lý TOEIC set/question (CRUD, import, upload media) và Writing set/question (CRUD, import, upload media).

## Dependencies & Assumptions
- `.env` cung cấp `JWT_SECRET`, `MONGO_URI`, `GEMINI_API_KEY`, cấu hình upload/storage.
- Cần kết nối mạng tới Gemini để chấm Writing; cần đường lùi khi AI không khả dụng.
- Media hiện phục vụ từ `/uploads`; dự kiến phải di chuyển sang lưu trữ ngoài cho production.
