# Chấm TOEIC Writing offline (Llama 3.2 8B qua Ollama)

Mục tiêu: cho phép chấm bài viết không cần gọi Gemini, chạy local, tách rời logic hiện tại.

## Tiến độ đã làm
- Thêm nút "Chấm offline (Llama 8B)" ở sidebar trang `attemptWritingPage` (không ảnh hưởng luồng nộp/Gemini).
- Tách API client riêng `client/src/utils/localWritingApi.js` gọi URL local `VITE_LOCAL_WRITING_URL` (mặc định http://localhost:3001/local-writing-score).
- Thêm thông báo hiển thị kết quả/ lỗi ngay trên đầu trang làm bài viết.

Chỉ cần bật service dưới đây để sử dụng.

## 1) Chuẩn bị
- Cài Ollama: https://ollama.com/download
- Kéo model (tên phổ biến trên Ollama):
  - Đủ máy: `ollama pull llama3.1:8b`
  - Nhẹ hơn: `ollama pull llama3.1:8b-instruct-q4_0`
  - Hoặc: `ollama pull llama3:8b`
- Node 18+ để chạy service nhỏ.

## 2) Service mẫu (Node) để chấm offline
Đã kèm sẵn file mẫu: `tools/local-writing-service.js`. Chạy lệnh cài gói rồi start:
```bash
npm i express cors ollama
node tools/local-writing-service.js
```
Hoặc copy đoạn dưới nếu muốn đặt ở thư mục khác:

```js
// local-writing-service.js
import express from "express";
import cors from "cors";
import { Ollama } from "ollama";

const app = express();
app.use(cors());
app.use(express.json());

const ollama = new Ollama({ host: "http://localhost:11434" });
const MODEL = process.env.LOCAL_WRITING_MODEL || "llama3.1:8b"; // đổi theo model bạn đã pull

const systemPrompt = `
Bạn là giám khảo TOEIC Writing. Chấm dựa trên 5 tiêu chí: grammar, vocabulary, organization, task_response, coherence. Mỗi tiêu chí 0-5. Tạo gợi ý cải thiện súc tích bằng tiếng Việt. Tính overall 0-200 = (tổng điểm 5 tiêu chí) * 8, làm tròn gần nhất.
Trả JSON duy nhất, không giải thích thêm:
{"overall": number,"criteria":{"grammar":0-5,"vocabulary":0-5,"organization":0-5,"task_response":0-5,"coherence":0-5},"suggestions":["..."],"summary":"1-2 câu tóm tắt ngắn tiếng Việt"}`.trim();

app.post("/local-writing-score", async (req, res) => {
  const { answerText = "", questionText = "" } = req.body || {};
  if (!answerText.trim()) {
    return res.status(400).json({ ok: false, msg: "Thiếu bài làm" });
  }
  try {
    const userPrompt = `Đề bài:\n${questionText}\n\nBài làm:\n${answerText}\n\nHãy chấm và trả JSON như mẫu.`;
    const reply = await ollama.generate({
      model: MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      options: { temperature: 0.4 },
    });

    // ollama.generate trả { response: "...json..." }
    const text = reply?.response || "";
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    const jsonSlice =
      firstBrace >= 0 && lastBrace > firstBrace
        ? text.slice(firstBrace, lastBrace + 1)
        : text;
    const parsed = JSON.parse(jsonSlice);
    return res.json({ ok: true, ...parsed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, msg: "Chấm offline lỗi", error: String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Local writing scorer chạy ở http://localhost:${PORT}/local-writing-score`);
});
```

Chạy service: `node tools/local-writing-service.js`

## 3) Kết nối front-end
- Nếu service không chạy port 3001, đặt env: `VITE_LOCAL_WRITING_URL=http://localhost:3001/local-writing-score`.
- Khởi động client (`npm run dev`). Vào trang làm bài viết, hoàn thành bài -> bấm "Chấm offline (Llama 8B)" trong sidebar. Kết quả hiển thị ở đầu trang; không ảnh hưởng đến nút nộp/Gemini hiện tại.

## 4) Lưu ý
- Logic Gemini giữ nguyên; offline chỉ gọi URL khác.
- Máy cần đủ RAM/GPU để chạy 8B. Nếu yếu, dùng bản quant q4_0 hoặc đổi MODEL env.
- Nếu muốn ẩn nút offline trên môi trường production, có thể che bằng cấu hình env hoặc flag trong UI (chưa triển khai).
