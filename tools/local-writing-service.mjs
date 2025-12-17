// Simple local TOEIC Writing scorer using Ollama (Llama 3.x 8B).
// Run: npm i express cors ollama && node tools/local-writing-service.js
import express from "express";
import cors from "cors";
import { Ollama } from "ollama";

const app = express();
app.use(cors());
app.use(express.json());

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://localhost:11434" });
// Dùng model phổ biến sẵn trên Ollama; có thể đổi qua env LOCAL_WRITING_MODEL
// Ví dụ: llama3.1:8b, llama3.1:8b-instruct-q4_0 (nhẹ, nếu đã pull), llama3:8b
const MODEL = process.env.LOCAL_WRITING_MODEL || "llama3.1:8b";
const PORT = process.env.PORT || 3001;

const parseJsonFromText = (text) => {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const jsonSlice = text.slice(firstBrace, lastBrace + 1);
    return JSON.parse(jsonSlice);
  }
  return JSON.parse(text);
};

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

    const text = reply?.response || "";
    const parsed = parseJsonFromText(text);
    return res.json({ ok: true, ...parsed });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, msg: "Chấm offline lỗi (parse JSON)", error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Local writing scorer chạy ở http://localhost:${PORT}/local-writing-score`);
  console.log(
    `Model: ${MODEL} | Ollama host: ${process.env.OLLAMA_HOST || "http://localhost:11434"}`
  );
});

