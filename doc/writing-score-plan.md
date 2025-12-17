# Kế Hoạch SDTB - Chấm điểm Writing & Dự đoán điểm thi thực tế

Giữ form gọn, tiếng Việt, bám sát cách viết hiện tại.

## Situation
- Chấm Writing đang dùng `server/utils/writingGrader.js` gọi Gemini 2.5 Flash (trước đó 2.0 hết quota). Nguy cơ hết quota không kiểm soát; chưa có fallback/queuing/caching.
- Điểm Writing lưu trong `ToeicWritingAttempt` (overall 0-5, predictedToeicScore 0-200, level 1-8). MCQ TOEIC (Listening/Reading) có `scorePercent` và `scoreByPart` trong `ToeicAttempt`.
- Chưa có module dự đoán điểm thi thực tế tổng hợp L+R+W; chưa có mô hình/logic, chưa có API/FE hiển thị.

## Target
- Ổn định chấm Writing: giảm lỗi quota, có fallback và quan sát được.
- Bổ sung module dự đoán điểm thi thực tế (L+R+W) dựa trên dữ liệu attempt hiện có; hiển thị cho người dùng.

## Deliverables
- D1 (Writing cũ): Lớp chấm Writing có queue + hạn mức, fallback khi hết quota, logging/metrics cơ bản.
- D2 (Writing cũ): Cache kết quả theo attempt/question để tránh gọi AI lặp; retry với backoff; alert khi sắp chạm quota.
- D3 (Điểm thi mới): Service tính điểm dự đoán L+R+W, API trả về, hiển thị trên Dashboard/Review/Profile.
- D4 (Điểm thi mới): Tài liệu công thức/giả định và test dữ liệu mẫu.

## Backlog & Phases
### Phần A: Ổn định chấm Writing (hiện có)
- Phase 0 - Thiết lập
  - Thêm cấu hình hạn mức/quota (ENV: `GEMINI_MAX_CALLS_PER_DAY`, `GEMINI_TIMEOUT_MS`).
  - Log structured cho mỗi lần gọi (`attemptId`, `questionId`, thời gian, status).
- Phase 1 - Queue & Retry
  - Bọc `gradeWriting` trong job queue nhẹ (in-memory/Redis tùy môi trường).
  - Retry có backoff khi lỗi 429/5xx; giới hạn số lần.
  - Timeout cứng, hủy job nếu quá hạn.
- Phase 2 - Cache & Fallback
  - Cache theo `attemptId-questionId` (và hash answer) để tránh gọi lại.
  - Fallback: nếu hết quota/429, trả về bộ điểm mặc định an toàn (ví dụ overall 3.0/5, predicted 120/200) + flag `fallback:true`.
  - Lưu raw response để audit; clamp điểm 0-5 và 0-200 (đã có, tiếp tục giữ).
- Phase 3 - Quan sát & Cảnh báo
  - Đếm số lần gọi/429 theo ngày, log cảnh báo khi vượt ngưỡng 80%.
  - Endpoint/health nhỏ: `/health/ai-writing` trả số call còn lại (dựa trên đếm nội bộ).

### Phần B: Module dự đoán điểm thi thực tế (mới)
- Phase 0 - Đặt giả định & công thức
  - Đầu vào: 
    - L+R: `ToeicAttempt.scorePercent` và `scoreByPart` (p1-p7).
    - Writing: `ToeicWritingAttempt.summary.predictedToeicScore` (0-200) và `overallScore`.
  - Đầu ra: `predictedTotal` (0-990), `predictedListening`, `predictedReading`, `predictedWriting` (0-200), kèm mức tin cậy (low/med/high).
  - Công thức baseline (đơn giản, có thể tinh chỉnh):
    - Listening+Reading (thang 0-800): `lr = round(scorePercent/100 * 800)` hoặc tách trọng số theo parts (p1-4 vs p5-7).
    - Writing giữ thang 0-200 từ AI.
    - Tổng TOEIC giả định: `predictedTotal = lr + writing`.
    - Tin cậy: dựa vào số attempt gần đây (>=3 mỗi mảng -> high, 1-2 -> med, 0 -> low).
- Phase 1 - Service & Model dữ liệu
  - Viết service `predictionService` tính toán từ attempt gần nhất hoặc trung bình 3 attempt gần nhất.
  - Thêm endpoint: 
    - `/prediction/my/latest` (auth): trả predictedTotal + breakdown + confidence + nguồn dữ liệu.
  - Không thay đổi schema DB giai đoạn đầu (tính on-the-fly).
- Phase 2 - Tích hợp FE
  - LeftBar: thêm mục con dưới nhóm Practice, dẫn tới trang mới (ví dụ `/practice/prediction`) hiển thị thẻ “Dự đoán điểm thi” với tổng và breakdown + confidence.
  - Trang prediction: dùng dữ liệu từ `/prediction/my/latest`; nếu thiếu dữ liệu thì hướng dẫn làm đủ L+R+W.
  - Dashboard/Profile/Review: có thể đặt thẻ tóm tắt nhỏ (optional), nhưng entry chính nằm ở Practice submenu.
  - Tooltip giải thích công thức và hạn chế.
- Phase 3 - Độ chính xác & Kiểm thử
  - Thêm unit test cho công thức.
  - Test giả lập dữ liệu (high/low score, thiếu Writing, thiếu L/R).
  - Hook để sau này thay bằng mô hình ML (nếu có tập dữ liệu thực).

## Ưu tiên thực thi
1) Writing: Queue + Retry + Cache + Fallback (Phase 0-2 phần A) để giảm lỗi quota ngay.
2) Writing: Health/alert quota (Phase 3 phần A) để theo dõi trần gọi Gemini.
3) Dự đoán điểm: Xác nhận công thức baseline + service + endpoint (Phase 0-1 phần B).
4) FE hiển thị dự đoán + test dữ liệu mẫu (Phase 2-3 phần B).

## Phụ thuộc / Yêu cầu
- ENV: `GEMINI_API_KEY`, `GEMINI_MAX_CALLS_PER_DAY`, `GEMINI_TIMEOUT_MS`; (tùy chọn) Redis nếu dùng queue/cache ngoài.
- Dữ liệu hiện có: `ToeicAttempt` (scorePercent/scoreByPart), `ToeicWritingAttempt` (predictedToeicScore/overallScore).
- Cần mạng ra Gemini; phải có đường lùi khi mất quota hoặc mạng.
