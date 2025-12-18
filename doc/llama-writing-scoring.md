# Resume chấm điểm Llama TOEIC Writing

## Mục tiêu
- Llama chấm từng câu (8 câu) với thang 0-5, quy đổi TOEIC Writing 0-200 theo band chuẩn.
- Lưu và hiển thị đầy đủ feedback/study plan cho cả Gemini và Llama trên trang review.
- Theo dõi tiến độ và các bước cần làm tiếp.

## Đã làm (17/12)
- Chuẩn hóa service local (`tools/local-writing-service.{js,mjs}`):
  - Ràng buộc JSON đầu ra chuẩn: task/grammar/vocabulary/organization/overallScore 0-5; predictedToeicScore 0-200 theo band Level 1-8.
  - Thêm bước normalize để cắt ngưỡng, làm tròn bước 10, gán level, lọc feedback/studyPlan/suggestions.
  - Prompt tiếng Việt rõ ràng, yêu cầu “CHỈ trả về JSON”, feedback 100-170 từ, giọng thân thiện/khoa học, có ví dụ/hướng viết lại + kế hoạch 3 bước, động viên; tự động sinh feedback + studyPlan khi model thiếu (không để trống câu, tối thiểu ~120 ký tự).
- Backend `submit-llama`:
  - Chuẩn hóa mỗi câu bằng `normalizeLlamaScore`, fix wordCount, gắn tiêu chí trung bình, snap TOEIC 0-200 theo band, lưu feedback/studyPlan an toàn.
  - Hàm `clampToeicScore/snapToeicScore` dùng band Level 1-8 cho cả Gemini/Llama.
- Gemini grader (`writingGrader`): siết prompt yêu cầu CHỈ tiếng Việt, không song ngữ/tiếng Anh; output JSON thuần.
- Frontend review (`ToeicWritingReviewPage.jsx`):
  - Hiển thị lại Overall/Toeic của Llama, feedback, study plan; thêm tag Overall/Toeic per câu; fallback khi thiếu dữ liệu.
  - Giao diện tiếng Việt, tránh mất feedback khi nộp bằng Llama.
- Attempt page: hiển thị Overall offline cũng đọc được `overallScore`.

## Cần làm/kiểm thử tiếp
1) Kiểm tra thực tế luồng nộp bằng Llama (Ollama chạy `node tools/local-writing-service.js`), đảm bảo mọi câu đều có feedback/studyPlan sinh tự động nếu model thiếu.
2) Nếu cần, bổ sung hiển thị Toeic Writing Level ở UI và log thêm raw response để debug.
3) Chạy thử nộp bằng Gemini để so sánh predictedToeic sau khi snap band; nếu Gemini trả feedback tiếng Anh, cân nhắc ép `level: "TOEIC"` + hệ thống prompt tiếng Việt trong `writingGrader` (Gemini).
4) Gom feedback người dùng về độ sát điểm để tinh chỉnh prompt/temperature.

## Lệnh hữu ích
- Chạy service local: `node tools/local-writing-service.js` (hoặc `.mjs`, cổng mặc định 3001, model `llama3.1:8b`).
- URL chấm local: `VITE_LOCAL_WRITING_URL=http://localhost:3001/local-writing-score`.

## Ghi chú nhanh
- Band quy đổi: Level 1 (0-30), 2 (40-50), 3 (60-70), 4 (80-100), 5 (110-130), 6 (140-160), 7 (170), 8 (180-200); điểm được làm tròn bước 10 và ép vào khoảng band.
- Mọi feedback/study plan đều được làm sạch chuỗi, tránh lỗi khi render danh sách.
