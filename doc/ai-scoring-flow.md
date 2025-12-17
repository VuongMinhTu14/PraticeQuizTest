# Luồng chấm điểm AI (TOEIC Writing) - PracticeQuiz

## Mô tả ngắn
- Hệ thống chỉ chấm TOEIC Writing bằng AI (Gemini 2.5 Flash). TOEIC Listening/Reading chấm trên server.
- Khi người dùng nộp bài viết, backend gọi hàm `gradeWriting` cho từng câu, parse kết quả JSON, lưu vào attempt.

## Luồng hoạt động (high-level)
1) **Người dùng làm bài Writing** (client) → nhập đáp án text.
2) **Nộp bài**: FE gọi `POST /toeic-writing/attempts/:attemptId/submit` kèm answers.
3) **Server** nhận request:
   - Lấy danh sách câu hỏi theo `questionId`.
   - Với mỗi câu có nội dung → gọi `gradeWriting(...)`.
4) **`gradeWriting`**:
   - Kiểm tra quota (`GEMINI_MAX_CALLS_PER_DAY`), cache theo hash `prompt+answer+rubric`.
   - Gọi API Gemini 2.5 Flash `models/gemini-2.5-flash:generateContent` (HTTP POST, key từ ENV).
   - Parse JSON trả về (hoặc fallback nếu lỗi/quota).
   - Trả về: taskScore, grammarScore, vocabularyScore, organizationScore, overallScore, predictedToeicScore (0-200), toeicWritingLevel, bands, studyPlan, feedback, fallback flag.
5) **Lưu kết quả**:
   - Ghi vào `answers[].ai` cho từng câu.
   - Tính summary trung bình (avg* và predictedToeicScore) lưu vào `ToeicWritingAttempt.summary`.
   - Đánh dấu `isSubmitted=true`, `submittedAt`.
6) **Trả response**: FE nhận summary + answers (có điểm AI).

## API/backend chính
- `POST /toeic-writing/attempts/:attemptId/submit` (auth): gọi `submitWritingAttempt` → `gradeWriting` từng câu → lưu attempt.
- `GET /toeic-writing/attempts/:id/review` (auth): trả attempt + câu hỏi + điểm AI để hiển thị.
- `server/utils/writingGrader.js`: logic gọi Gemini (quota, cache, timeout, fallback).
- ENV: `GEMINI_API_KEY`, `GEMINI_MAX_CALLS_PER_DAY` (0 = không giới hạn), `GEMINI_TIMEOUT_MS` (ms).

## Cách gọi `gradeWriting` (tham chiếu code)
```js
const aiResult = await gradeWriting({
  prompt: q.prompt,       // đề bài/câu hỏi
  answerText: text,       // câu trả lời của thí sinh
  rubric: q.rubric,       // rubric/note (optional)
  level: "TOEIC",         // mặc định
});
```
Kết quả được gắn vào `answerDocs.push({ ... ai: aiResult })`.

## Flowchart (ASCII)
```
[User nhập bài viết]
       |
       v
[FE submit: POST /toeic-writing/attempts/:id/submit]
       |
       v
[Server: lấy câu hỏi theo questionId]
       |
       v
    (loop từng câu có text)
       |
       v
  [gradeWriting]
    |-- check cache/quota
    |-- call Gemini API (key ENV)
    |-- parse JSON hoặc fallback
    '-- trả điểm + band + studyPlan
       |
       v
[Gộp summary avg*, predictedToeicScore]
       |
       v
[Lưu ToeicWritingAttempt.answers + summary,
 isSubmitted=true, submittedAt]
       |
       v
[Response OK -> FE hiển thị điểm AI]
```

## Lưu ý / hạn chế hiện tại
- Chưa có queue/retry khi gọi Gemini; timeout mặc định 15s.
- Fallback trả điểm an toàn (overall ~3/5, predicted 120/200) khi quota/lỗi parse.
- Cache hiện tại in-memory theo hash prompt+answer+rubric (chỉ sống theo process).
- Chưa log chi tiết response thô; chưa có cảnh báo quota gần hết.
- Điểm TOEIC Writing là ước lượng từ AI, không phải bảng quy đổi ETS chính thức.

---

# Luồng làm bài TOEIC Listening & Reading (MCQ)
- Chấm trên server (không AI). Điểm = số câu đúng/tổng, tính % và breakdown theo Part.
- Endpoint chính:
  - Tạo attempt: `POST /toeic/sets/:id/attempts` (auth, có thể chọn part hoặc full).
  - Lấy attempt + câu hỏi: `GET /toeic/attempts/:id` và `GET /toeic/sets/:id/questions`.
  - Nộp bài: `POST /toeic/attempts/:id/submit` (auth).
  - Xem review: `GET /toeic/attempts/:id/review`.
  - Gần nhất: `GET /toeic/sets/:id/last-attempt`, `GET /toeic/my/recent-attempts`.

## Flowchart (ASCII)
```
[User chọn đề/part L&R]
      |
      v
[FE tạo attempt: POST /toeic/sets/:id/attempts
 body: selectedParts, timeLimit]
      |
      v
[FE load attempt + câu hỏi:
 GET /toeic/attempts/:id
 GET /toeic/sets/:id/questions]
      |
      v
[User làm bài (timer, audio/image)]
      |
      v
[FE submit: POST /toeic/attempts/:id/submit
 body: answers[] {questionId, selectedOption}]
      |
      v
[Server chấm: so sánh selectedOption == correctOption
 -> tính correct/total per part (scoreByPart),
 tổng correct, % overall]
      |
      v
[Lưu ToeicAttempt: scoreByPart,
 totalQuestions, totalCorrect, scorePercent,
 status=submitted, submittedAt]
      |
      v
[Response OK -> FE hiển thị kết quả]
      |
      v
[FE có thể gọi GET /toeic/attempts/:id/review
 để hiển thị breakdown, lựa chọn đúng/sai theo câu]
```

## Tính điểm
- Mỗi câu đúng +1. Phần trăm theo part: `correct/total*100`, tổng % = `totalCorrect/totalQuestions*100`.
- Không có quy đổi thang ETS 495/495; nếu cần ước lượng điểm (giống Study4) cần bổ sung hàm map % → điểm section (chưa có).
