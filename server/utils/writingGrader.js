// server/utils/writingGrader.js
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// map TOEIC Writing 0–200 -> level 1–8
function mapToeicWritingLevel(score) {
  if (score <= 30) return 1;      // Level 1: 0–30
  if (score <= 50) return 2;      // Level 2: 40–50
  if (score <= 70) return 3;      // Level 3: 60–70
  if (score <= 100) return 4;     // Level 4: 80–100
  if (score <= 130) return 5;     // Level 5: 110–130
  if (score <= 160) return 6;     // Level 6: 140–160
  if (score <= 170) return 7;     // Level 7: ~170
  return 8;                       // Level 8: 180–200
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

export async function gradeWriting({ prompt, answerText, rubric, level = "TOEIC" }) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");
  }

  const systemInstruction = `
Bạn là giám khảo TOEIC Writing.

Nhiệm vụ:
- Đọc đề bài (prompt) và bài viết của thí sinh.
- Chấm bài theo 4 tiêu chí: Task achievement, Grammar, Vocabulary, Organization.
- Đưa ra điểm Overall và quy đổi sang thang điểm TOEIC Writing 0–200.

YÊU CẦU ĐẦU RA:
- CHỈ trả về một JSON thuần (không giải thích, không thêm text ngoài JSON).
- Cấu trúc JSON:

{
  "taskScore": number,          // 0–5
  "grammarScore": number,       // 0–5
  "vocabularyScore": number,    // 0–5
  "organizationScore": number,  // 0–5
  "overallScore": number,       // 0–5
  "predictedToeicScore": number,// 0–200
  "feedback": string            // Nhận xét khoảng 4–6 câu, bằng TIẾNG VIỆT, dễ hiểu.
}

Lưu ý:
- Các điểm *Score phải nằm trong khoảng 0–5.
- "predictedToeicScore" phải nằm trong khoảng 0–200.
`;

  const userContent = `
[WRITING TASK PROMPT]
${prompt}

[STUDENT ANSWER]
${answerText}

[RUBRIC] (ghi chú tiếng Việt, chỉ để tham khảo):
${rubric || "(không có ghi chú thêm)"}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Gemini HTTP error:", res.status, errText);
    throw new Error(`Gemini API lỗi: HTTP ${res.status}`);
  }

  const data = await res.json();

  // Lấy text từ candidates
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text) {
    console.error("Gemini trả về rỗng, raw:", JSON.stringify(data));
    throw new Error("Gemini trả về nội dung rỗng");
  }

  let parsed;
  try {
    const jsonStr = extractJson(text);
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error("Gemini JSON parse error, raw text:", text);
    // fallback an toàn, tránh crash
    parsed = {
      taskScore: 3,
      grammarScore: 3,
      vocabularyScore: 3,
      organizationScore: 3,
      overallScore: 3,
      predictedToeicScore: 120,
      feedback:
        "Hệ thống gặp lỗi khi phân tích kết quả từ AI. Điểm tạm thời là 3/5 cho các tiêu chí, tương đương khoảng 120/200. Vui lòng thử chấm lại sau khi hệ thống ổn định.",
    };
  }

  const safeNumber = (v, def = 0) =>
    typeof v === "number" && !Number.isNaN(v) ? v : def;

  const taskScore = safeNumber(parsed.taskScore, 3);
  const grammarScore = safeNumber(parsed.grammarScore, 3);
  const vocabularyScore = safeNumber(parsed.vocabularyScore, 3);
  const organizationScore = safeNumber(parsed.organizationScore, 3);
  const overallScore = safeNumber(parsed.overallScore, 3);

  let predicted =
    typeof parsed.predictedToeicScore === "number"
      ? parsed.predictedToeicScore
      : null;

  if (predicted == null) {
    predicted = Math.round((overallScore / 5) * 200);
  }
  predicted = Math.max(0, Math.min(200, predicted)); // clamp 0–200

  const toeicLevel = mapToeicWritingLevel(predicted);

  return {
    taskScore,
    grammarScore,
    vocabularyScore,
    organizationScore,
    overallScore,
    predictedToeicScore: predicted,
    toeicWritingLevel: toeicLevel,
    feedback:
      typeof parsed.feedback === "string"
        ? parsed.feedback
        : "AI chưa cung cấp nhận xét chi tiết. Vui lòng thử lại sau.",
    level,
  };
}

export default gradeWriting;
