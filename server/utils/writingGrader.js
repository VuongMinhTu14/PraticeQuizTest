import dotenv from "dotenv";
import { createHash } from "crypto";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_CALLS_PER_DAY = Number(process.env.GEMINI_MAX_CALLS_PER_DAY || "0"); // 0 = không giới hạn
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || "15000");

// Bộ đếm quota đơn giản theo ngày
let dailyCounter = { day: "", count: 0 };
// Cache theo nội dung prompt/answer/rubric để tránh gọi trùng
const cache = new Map();

const FALLBACK_RESULT = {
  taskScore: 3,
  grammarScore: 3,
  vocabularyScore: 3,
  organizationScore: 3,
  overallScore: 3,
  predictedToeicScore: 120,
  toeicWritingLevel: 4,
  bands: {
    task: "Fallback",
    grammar: "Fallback",
    vocabulary: "Fallback",
    organization: "Fallback",
  },
  studyPlan: [
    "Ôn lại ngữ pháp cơ bản và cấu trúc câu.",
    "Luyện viết đoạn 120-150 từ, chia ý rõ ràng.",
    "Rà soát từ vựng và lỗi chính tả trước khi nộp.",
  ],
  feedback: "Hệ thống đang dùng kết quả dự phòng do quota hoặc lỗi AI.",
  fallback: true,
};

// map TOEIC Writing 0-200 -> level 1-8
function mapToeicWritingLevel(score) {
  if (score <= 30) return 1;
  if (score <= 50) return 2;
  if (score <= 70) return 3;
  if (score <= 100) return 4;
  if (score <= 130) return 5;
  if (score <= 160) return 6;
  if (score <= 170) return 7;
  return 8;
}

// helper cắt ```json ... ``` nếu model trả về dạng code block
function extractJson(text = "") {
  const trimmed = text.trim();
  const codeBlockMatch =
    trimmed.match(/```json([\s\S]*?)```/i) ||
    trimmed.match(/```([\s\S]*?)```/i);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
  return jsonStr;
}

function makeCacheKey({ prompt, answerText, rubric }) {
  const h = createHash("sha256");
  h.update(prompt || "");
  h.update("||");
  h.update(answerText || "");
  h.update("||");
  h.update(rubric || "");
  return h.digest("hex");
}

function touchCounter() {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyCounter.day !== today) {
    dailyCounter = { day: today, count: 0 };
  }
}

function canCallGemini() {
  touchCounter();
  if (MAX_CALLS_PER_DAY > 0 && dailyCounter.count >= MAX_CALLS_PER_DAY) {
    return false;
  }
  return true;
}

function incCounter() {
  touchCounter();
  dailyCounter.count += 1;
}

async function callGemini(prompt, answerText, rubric, level) {
  const systemInstruction = `
Bạn là giám khảo TOEIC Writing.

Nhiệm vụ:
- Đọc đề bài (prompt) và bài viết của thí sinh.
- Chấm bài theo 4 tiêu chí: Task achievement, Grammar, Vocabulary, Organization.
- Đưa ra điểm Overall và quy đổi sang thang điểm TOEIC Writing 0-200.
- Đánh giá band cho từng tiêu chí và gợi ý lộ trình học tập.

YÊU CẦU ĐẦU RA:
- CHỈ trả về JSON thuần (không giải thích thêm).
- Cấu trúc JSON:

{
  "taskScore": number,           // 0-5
  "grammarScore": number,        // 0-5
  "vocabularyScore": number,     // 0-5
  "organizationScore": number,   // 0-5
  "overallScore": number,        // 0-5
  "predictedToeicScore": number, // 0-200

  "bands": {
    "task": string,
    "grammar": string,
    "vocabulary": string,
    "organization": string
  },

  "feedback": string,
  "studyPlan": [
    "Gợi ý 1...",
    "Gợi ý 2...",
    "Gợi ý 3..."
  ]
}

Lưu ý:
- Score trong khoảng 0-5; predictedToeicScore trong 0-200.
- Nếu thiếu thông tin, trả về giá trị an toàn nhưng vẫn đúng schema.
`;

  const userContent = `
[WRITING TASK PROMPT]
${prompt}

[STUDENT ANSWER]
${answerText}

[RUBRIC] (ghi chú tiếng Việt, chỉ để tham khảo):
${rubric || "(không có ghi chú thêm)"}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: systemInstruction + "\n\n" + userContent,
          },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      throw new Error("Gemini trả về trống");
    }
    return text;
  } finally {
    clearTimeout(to);
  }
}

export async function gradeWriting({
  prompt,
  answerText,
  rubric,
  level = "TOEIC",
}) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY chưa có trong .env");
  }

  const cacheKey = makeCacheKey({ prompt, answerText, rubric });
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  if (!canCallGemini()) {
    console.warn("Gemini quota reached, dùng fallback");
    return FALLBACK_RESULT;
  }

  try {
    incCounter();
    const text = await callGemini(prompt, answerText, rubric, level);

    let parsed;
    try {
      const jsonStr = extractJson(text);
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.error("Gemini JSON parse error, dùng fallback, raw text:", text);
      parsed = null;
    }

    const safeNumber = (v, def = 0) =>
      typeof v === "number" && !Number.isNaN(v) ? v : def;

    const taskScore = safeNumber(parsed?.taskScore, 3);
    const grammarScore = safeNumber(parsed?.grammarScore, 3);
    const vocabularyScore = safeNumber(parsed?.vocabularyScore, 3);
    const organizationScore = safeNumber(parsed?.organizationScore, 3);
    const overallScore = safeNumber(parsed?.overallScore, 3);

    let predicted =
      typeof parsed?.predictedToeicScore === "number"
        ? parsed.predictedToeicScore
        : null;

    if (predicted == null) {
      predicted = Math.round((overallScore / 5) * 200);
    }
    predicted = Math.max(0, Math.min(200, predicted));

    const toeicLevel = mapToeicWritingLevel(predicted);

    const bands =
      parsed?.bands && typeof parsed.bands === "object"
        ? {
            task: parsed.bands.task || "Không rõ",
            grammar: parsed.bands.grammar || "Không rõ",
            vocabulary: parsed.bands.vocabulary || "Không rõ",
            organization: parsed.bands.organization || "Không rõ",
          }
        : {
            task: "Không rõ",
            grammar: "Không rõ",
            vocabulary: "Không rõ",
            organization: "Không rõ",
          };

    const studyPlan = Array.isArray(parsed?.studyPlan)
      ? parsed.studyPlan.filter((s) => typeof s === "string" && s.trim())
      : [];

    const result = {
      taskScore,
      grammarScore,
      vocabularyScore,
      organizationScore,
      overallScore,
      predictedToeicScore: predicted,
      toeicWritingLevel: toeicLevel,
      bands,
      studyPlan,
      feedback:
        typeof parsed?.feedback === "string"
          ? parsed.feedback
          : "AI chưa cung cấp nhận xét chi tiết. Vui lòng thử lại sau.",
      level,
      fallback: false,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("gradeWriting fallback vì lỗi/quota:", err?.message || err);
    return FALLBACK_RESULT;
  }
}

export default gradeWriting;
