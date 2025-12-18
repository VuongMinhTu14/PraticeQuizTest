import dotenv from "dotenv";
import { createHash } from "crypto";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_CALLS_PER_DAY = Number(process.env.GEMINI_MAX_CALLS_PER_DAY || "0"); // 0 = khÃ´ng giá»›i háº¡n
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || "15000");

// Bá»™ Ä‘áº¿m quota Ä‘Æ¡n giáº£n theo ngÃ y
let dailyCounter = { day: "", count: 0 };
// Cache theo ná»™i dung prompt/answer/rubric Ä‘á»ƒ trÃ¡nh gá»i trÃ¹ng
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
    "Ã”n láº¡i ngá»¯ phÃ¡p cÆ¡ báº£n vÃ  cáº¥u trÃºc cÃ¢u.",
    "Luyá»‡n viáº¿t Ä‘oáº¡n 120-150 tá»«, chia Ã½ rÃµ rÃ ng.",
    "RÃ  soÃ¡t tá»« vá»±ng vÃ  lá»—i chÃ­nh táº£ trÆ°á»›c khi ná»™p.",
  ],
  feedback: "Há»‡ thá»‘ng Ä‘ang dÃ¹ng káº¿t quáº£ dá»± phÃ²ng do quota hoáº·c lá»—i AI.",
  fallback: true,
};

const isTruncatedFeedback = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 120) return true;
  if (/[:\-]\s*$/.test(trimmed)) return true; // kết thúc dở dang
  if (!/[.!?…'"”’)]$/.test(trimmed)) return true; // thiếu dấu kết câu
  return false;
};

const buildFeedbackFromScores = ({ taskScore, grammarScore, vocabularyScore, organizationScore }) => {
  const weak = [];
  const strong = [];
  const check = (score, label, weakness, strength) => {
    if (score <= 2.5) weak.push(`${label}: ${weakness}`);
    else if (score >= 4) strong.push(`${label}: ${strength}`);
  };

  check(taskScore, "Task", "cần bám sát yêu cầu và thêm ví dụ cụ thể", "nắm đúng yêu cầu, có ý chính rõ");
  check(grammarScore, "Grammar", "có lỗi chia thì/cấu trúc, nên đơn giản hóa câu", "câu mạch lạc, ít lỗi hình thái");
  check(vocabularyScore, "Vocabulary", "từ vựng lặp lại, thiếu paraphrase/collocation", "dùng từ phù hợp, có paraphrase");
  check(organizationScore, "Organization", "thiếu kết nối giữa ý, đoạn mở/thân/kết chưa rõ", "bố cục gọn, chuyển ý mượt");

  const strongPart =
    strong.length > 0
      ? `Điểm mạnh: ${strong.join("; ")}.`
      : "Điểm mạnh: giữ được cấu trúc cơ bản, ý chính đã xuất hiện.";
  const weakPart =
    weak.length > 0
      ? `Cần cải thiện: ${weak.join("; ")}.`
      : "Cần cải thiện: thêm ví dụ/chi tiết để làm rõ ý và tăng độ thuyết phục.";
  const plan =
    "Gợi ý: (1) Viết dàn ý 2-3 ý chính trước khi viết. (2) Dùng câu 12-18 từ, kiểm tra lại chính tả/chủ-vị. (3) Thêm từ nối (however, moreover, for example) và 1 ví dụ minh họa.";

  return `${strongPart} ${weakPart} ${plan}`;
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

// helper cáº¯t ```json ... ``` náº¿u model tráº£ vá» dáº¡ng code block
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
- Chấm 4 tiêu chí: Task achievement, Grammar, Vocabulary, Organization.
- Đưa ra điểm Overall và quy đổi sang thang TOEIC Writing 0-200.
- Đánh giá band cho từng tiêu chí và gợi ý lộ trình học tập.

YÊU CẦU NGÔN NGỮ:
- CHỈ dùng tiếng Việt, không tiếng Anh, không song ngữ, không kèm bản dịch.

YÊU CẦU ĐẦU RA:
- CHỈ trả về JSON thuần (không giải thích thêm, không bao code block).
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
- Điểm nằm trong 0-5; predictedToeicScore trong 0-200.
- Nếu thiếu thông tin, trả về giá trị an toàn nhưng vẫn đúng schema.
`;

  const userContent = `
[WRITING TASK PROMPT]
${prompt}

[STUDENT ANSWER]
${answerText}

[RUBRIC] (ghi chÃº tiáº¿ng Viá»‡t, chá»‰ Ä‘á»ƒ tham kháº£o):
${rubric || "(khÃ´ng cÃ³ ghi chÃº thÃªm)"}
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
      throw new Error("Gemini tráº£ vá» trá»‘ng");
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
    throw new Error("GEMINI_API_KEY chÆ°a cÃ³ trong .env");
  }

  const cacheKey = makeCacheKey({ prompt, answerText, rubric });
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  if (!canCallGemini()) {
    console.warn("Gemini quota reached, dÃ¹ng fallback");
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
      console.error("Gemini JSON parse error, dÃ¹ng fallback, raw text:", text);
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
            task: parsed.bands.task || "KhÃ´ng rÃµ",
            grammar: parsed.bands.grammar || "KhÃ´ng rÃµ",
            vocabulary: parsed.bands.vocabulary || "KhÃ´ng rÃµ",
            organization: parsed.bands.organization || "KhÃ´ng rÃµ",
          }
        : {
            task: "KhÃ´ng rÃµ",
            grammar: "KhÃ´ng rÃµ",
            vocabulary: "KhÃ´ng rÃµ",
            organization: "KhÃ´ng rÃµ",
          };

    const studyPlan = Array.isArray(parsed?.studyPlan)
      ? parsed.studyPlan.filter((s) => typeof s === "string" && s.trim())
      : [];

    let feedback =
      typeof parsed?.feedback === "string"
        ? parsed.feedback.trim()
        : "AI ch’øa cung c §p nh §-n xAct chi ti §¨t. Vui lAýng th ¯- l §­i sau.";
    if (isTruncatedFeedback(feedback)) {
      const cleaned = feedback.replace(/[:\-]\s*$/, "").trim();
      const fallbackFb = buildFeedbackFromScores({
        taskScore,
        grammarScore,
        vocabularyScore,
        organizationScore,
      });
      feedback = cleaned ? `${cleaned}. ${fallbackFb}` : fallbackFb;
    }

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
      feedback,
      level,
      fallback: false,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("gradeWriting fallback vÃ¬ lá»—i/quota:", err?.message || err);
    return FALLBACK_RESULT;
  }
}

export default gradeWriting;

