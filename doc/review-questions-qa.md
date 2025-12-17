# Review Q&A - PracticeQuiz

Gợi ý câu hỏi phản biện và trả lời mẫu (có dấu). Tách theo mức độ dễ/trung bình/khó. Thêm phụ lục tóm tắt cơ chế chấm điểm AI và dự đoán điểm thi.

## Dễ
1) Dự án giải quyết bài toán gì?  
   Trả lời: Nền tảng luyện thi TOEIC (Listening/Reading trắc nghiệm + Writing tự luận). Có 2 frontend (client cho người học, admin-client cho quản trị) nối với backend Express/Mongo, hỗ trợ upload media và chấm điểm AI cho Writing.

2) Luồng chính của người học?  
   Trả lời: Đăng ký/đăng nhập -> chọn bộ đề/chế độ luyện -> tạo attempt (full hoặc theo part) -> làm bài (có timer/media) -> nộp -> xem kết quả và review chi tiết (per question, per part) -> xem lịch sử trên Dashboard/Profile.

3) Các đối tượng dữ liệu chính?  
   Trả lời: User, ToeicSet (parts, duration, status), ToeicQuestion (choices, media), ToeicAttempt (answers, scoreByPart, scorePercent), ToeicWritingSet (parts w1_5, w6_7, w8), ToeicWritingQuestion (prompt/image/rubric), ToeicWritingAttempt (answers + AI scores, summary).

4) Frontend dùng công nghệ gì và target deploy?  
   Trả lời: Vite + React; client dùng React Query + Zustand; admin dùng Ant Design. Backend Express chạy trên Node, MongoDB. Endpoint mặc định `http://localhost:11111`, file static trong `/uploads`.

5) Cách đăng nhập và lưu token?  
   Trả lời: Gọi `/user/login` nhận JWT, lưu store/localStorage (`pq-auth` client, `pq_admin_token` admin). Gửi Authorization: Bearer ... cho API, có middleware verifyToken cho routes người dùng.

## Trung bình
1) Bảo mật admin hiện tại ra sao?  
   Trả lời: Middleware verifyToken cho admin router đang bị comment -> nguy cơ ai cũng gọi CRUD users/sets/questions. Cần bật lại check role, trả 401/403 về frontend.

2) Xử lý upload media thế nào?  
   Trả lời: Dùng express-fileupload, lưu thẳng vào `server/uploads/...` (image/audio/avatars). Chưa có CDN hay scan file; phù hợp dev/demo nhưng cần chuyển sang object storage và thêm validate mime/size.

3) Cơ chế chấm điểm AI Writing?  
   Trả lời: Trong `writingGrader.js` gọi Gemini 2.5 Flash với system prompt yêu cầu trả JSON (task/grammar/vocab/organization/overall 0-5, predictedToeic 0-200, bands, studyPlan). Có cache hash theo prompt+answer+rubric, đếm quota ngày (`GEMINI_MAX_CALLS_PER_DAY`), timeout. Nếu lỗi/quota thì fallback điểm an toàn (overall ~3/5, predicted 120) và gắn `fallback:true`.

4) Làm sao để tính điểm Writing cho 1 attempt?  
   Trả lời: `submitWritingAttempt` lặp từng câu, gọi `gradeWriting`, tính wordCount, ghi vào `answers[].ai`. Summary lấy trung bình các trường AI, làm tròn 2 chữ số, `predictedToeicScore` là trung bình tròn số.

5) Cơ chế dự đoán điểm thi tổng (L+R+W)?  
   Trả lời: `predictionService.buildUserPrediction` lấy tối đa 3 attempt Toeic và 3 attempt Writing gần nhất. ListeningPercent = tổng đúng p1-4 / tổng câu, ReadingPercent = p5-7. Map percent -> điểm 0-400 mỗi kỹ năng, Writing lấy `summary.predictedToeicScore` (0-200). Tổng = L + R (+ W nếu có). Confidence: >=3 attempt mỗi loại -> high, có >=1 -> medium, khác -> low. Trả về `missing` để thông báo thiếu dữ liệu.

6) Những rủi ro chính hiện tại?  
   Trả lời: Admin không được bảo vệ; upload không validate; import CSV/JSON thiếu validation; chưa có rate limit/log/monitoring; chấm điểm AI chưa có queue/retry/alert.

## Khó
1) Bạn chứng minh độ tin cậy của chấm điểm AI ra sao?  
   Trả lời: Đang dùng prompt-base, chưa có tập train riêng. Để tăng tin cậy: log response để audit, bổ sung replay sample, thêm queue + retry + alert quota, bổ sung đối chiếu thủ công một số mẫu (golden set). Nếu có dữ liệu thực, thay dần bằng model được huấn luyện (fine-tune hoặc RAG rubric chuẩn).

2) Xử lý trường hợp Gemini hết quota hay trả về JSON sai định dạng?  
   Trả lời: Hàm `gradeWriting` kiểm tra quota, nếu vượt trả fallback. Nếu JSON sai -> parse error -> fallback giá trị an toàn và log raw text. Có cache để tránh gọi lặp. Chưa có queue nên với nhiều yêu cầu song song có thể vượt quota/timeout; cần thêm job queue và retry backoff.

3) Làm sao để test module dự đoán điểm?  
   Trả lời: Có thể tạo unit test cho `aggregateToeic` và `aggregateWriting` với các bộ dữ liệu (đủ điểm L/R, thiếu Writing, điểm cao/thấp). Test confidence logic và clamp 0-100. Hiện chưa có test; cần thêm để bao hàm regression.

4) Nếu scale lên 1k người dùng đồng thời thì điểm nghe đọc có tin cậy?  
   Trả lời: MCQ chấm trên server nên scale theo CPU/Mongo; cần thêm cache đề set/question, index Mongo (userId, status, createdAt), rate limit. Write heavy khi upload/submit -> cần tách media sang storage và dùng CDN. Chấm điểm AI phải có queue/worker riêng để tránh block request.

5) Kế hoạch bảo mật và riêng tư cho uploads/dữ liệu cá nhân?  
   Trả lời: Hiện tại file public qua static `/uploads`. Để bảo mật: chuyển sang storage với signed URL, tách file riêng theo user, thêm scan virus, ẩn danh log, xoá dữ liệu khi user yêu cầu. Mật khẩu đã hash (bcrypt) nhưng cần thêm reset flow, JWT refresh/hủy token, CSP/helmet cho Express.

## Phụ lục A - Cơ chế chấm điểm AI Writing
- Mã nguồn chính: `server/utils/writingGrader.js`, được gọi trong `submitWritingAttempt` (toeicWriting.controller.js). 
- Đầu vào: prompt, answerText, rubric (optional), level = "TOEIC". 
- Bước: kiểm tra cache -> kiểm tra quota -> gọi Gemini 2.5 Flash với prompt JSON -> parse JSON (thử tách ```json``` nếu có) -> clamp/validate điểm -> suy ra predictedToeicScore nếu thiếu (overall/5*200) -> map level 1-8 từ 0-200 -> trả về studyPlan/bands/feedback. 
- Bảo vệ: quota theo env, timeout mặc định 15s, cache hash SHA-256, fallback an toàn nếu lỗi/quota/parse. Chưa có retry/backoff hay queue.

## Phụ lục B - Cơ chế dự đoán điểm thi
- Mã nguồn: `server/utils/predictionService.js`, endpoint GET `/prediction/my/latest` (có auth) trong `prediction.controller.js`. 
- Dữ liệu đầu vào: tối đa 3 ToeicAttempt submitted gần nhất + 3 ToeicWritingAttempt submitted gần nhất của user. 
- Tính L/R: cộng đúng/tổng p1-4 -> listeningPercent, p5-7 -> readingPercent; nếu thiếu dùng overallPercent. Map percent (0-100) -> điểm 0-400 mỗi kỹ năng. 
- Writing: lấy trung bình `summary.predictedToeicScore` của các attempt (0-200) và `avgOverallScore` làm writingOverallScore. 
- Tổng: nếu có cả L+R+W -> predictedTotal = L+R+W; nếu thiếu W -> chỉ L+R. 
- Confidence: high nếu có >=3 attempt L/R và >=3 attempt Writing; medium nếu có >=1; low nếu 0. Trả về danh sách `missing` để FE hướng dẫn user làm thêm bài. 
- Giới hạn hiện tại: không có machine learning, chỉ là heuristic; không có mô hình theo thời gian hay weighting per part; chưa lưu log/audit cho prediction.
