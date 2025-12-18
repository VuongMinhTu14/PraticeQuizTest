// Simple local TOEIC Writing scorer using Ollama (Llama 3.x 8B).
// Run: npm i express cors ollama && node tools/local-writing-service.js
const express = require("express");
const cors = require("cors");
const { Ollama } = require("ollama");

const app = express();
app.use(cors());
app.use(express.json());

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://localhost:11434" });
// Model mặc định; đổi qua LOCAL_WRITING_MODEL nếu cần (vd: llama3.1:8b, llama3:8b)
const MODEL = process.env.LOCAL_WRITING_MODEL || "llama3.1:8b";
const PORT = process.env.PORT || 3001;

const TOEIC_WRITING_LEVELS = [
  { level: 1, min: 0, max: 30 },
  { level: 2, min: 40, max: 50 },
  { level: 3, min: 60, max: 70 },
  { level: 4, min: 80, max: 100 },
  { level: 5, min: 110, max: 130 },
  { level: 6, min: 140, max: 160 },
  { level: 7, min: 170, max: 170 },
  { level: 8, min: 180, max: 200 },
];

const clamp = (v, min, max) => {
  const num = Number(v);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
};

const clampScore05 = (v) => {
  const num = Number(v);
  if (!Number.isFinite(num)) return 0;
  return Math.min(5, Math.max(0, Math.round(num * 100) / 100));
};

const buildFeedback = ({ taskScore, grammarScore, vocabularyScore, organizationScore }) => {
  const weak = [];
  const strong = [];
  const check = (score, label, weakness, strength) => {
    if (score <= 2.5) weak.push(`${label}: ${weakness}`);
    else if (score >= 4) strong.push(`${label}: ${strength}`);
  };
  check(taskScore, "Task", "cần bổ sung ý chính và ví dụ minh họa sát đề", "bám sát yêu cầu, ý rõ");
  check(grammarScore, "Grammar", "có lỗi ngữ pháp/câu rườm rà", "câu rõ ràng, ít lỗi");
  check(vocabularyScore, "Vocabulary", "từ vựng lặp lại/thiếu đa dạng", "từ phù hợp, có paraphrase");
  check(organizationScore, "Organization", "liên kết ý lỏng, mở-thân-kết chưa rõ", "bố cục gọn, chuyển ý mượt");

  const strongPart =
    strong.length > 0
      ? `Điểm mạnh: ${strong.join("; ")}.`
      : "Điểm mạnh: bạn đã cố gắng diễn đạt đầy đủ và giữ giọng văn thân thiện.";
  const weakPart =
    weak.length > 0
      ? `Điểm cần cải thiện: ${weak.join("; ")}.`
      : "Điểm cần cải thiện: thử thêm cấu trúc đa dạng và ví dụ cụ thể để bài viết sinh động hơn.";

  const rewriteTip =
    "Thử viết lại câu khó bằng khung ngắn: ý chính + lý do + ví dụ (\"Working from home boosts focus because I avoid commute; for example, I start earlier and finish reports faster\").";
  const flowTip =
    "Giữ mạch tự nhiên bằng từ nối (however, moreover, for example) và mở-thân-kết rõ. Thêm 1-2 chi tiết quen thuộc để minh họa, không cần quá dài.";
  const planTip =
    "Kế hoạch nhỏ: (1) Gạch ý chính và ví dụ trước khi viết. (2) Viết câu ngắn 12-18 từ, soát lỗi mạo từ/chủ-vị. (3) Đọc lại, thêm từ nối và kiểm tra kết bài.";
  const encourage =
    "Mỗi lỗi chỉ là điểm neo để luyện tập; bạn đã có nền tảng, hãy kiên trì bổ sung ý và soát lại trước khi nộp.";

  return `${strongPart} ${weakPart} ${rewriteTip} ${flowTip} ${planTip} ${encourage}`;
};

const buildStudyPlan = ({ taskScore, grammarScore, vocabularyScore, organizationScore }) => {
  const tips = [];
  if (taskScore < 4) tips.push("Đọc kỹ yêu cầu, liệt kê 2-3 ý chính trước khi viết, kiểm tra đủ ý.");
  if (grammarScore < 4) tips.push("Ôn thì cơ bản (hiện tại, quá khứ, hoàn thành), soát lỗi chủ-vị, mạo từ.");
  if (vocabularyScore < 4) tips.push("Thêm từ nối và paraphrase, tránh lặp từ khóa, dùng collocation quen thuộc.");
  if (organizationScore < 4) tips.push("Chia đoạn rõ ràng, mỗi đoạn 1 ý chính, dùng câu chủ đề và câu kết.");
  tips.push("Đọc lại và sửa lỗi chính tả/ngắt câu trước khi nộp.");
  return [...new Set(tips)].slice(0, 6);
};

const snapToeicScore = (rawScore, overallScore = 0) => {
  const base =
    Number.isFinite(rawScore) && rawScore > 0
      ? rawScore
      : Number.isFinite(overallScore)
        ? overallScore * 40
        : 0;

  const clamped = clamp(base, 0, 200);
  const snapped = Math.round(clamped / 10) * 10; // TOEIC Writing đi theo bước 10
  const band =
    TOEIC_WRITING_LEVELS.find((b) => snapped <= b.max) ||
    TOEIC_WRITING_LEVELS[TOEIC_WRITING_LEVELS.length - 1];

  const predicted = clamp(snapped, band.min, band.max);
  return { predicted, level: band.level };
};

const normalizeStudyList = (list, fallback = []) => {
  if (!Array.isArray(list)) return fallback;
  return list
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
};

const normalizeFeedbackText = (raw) => {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "";
};

const isTruncatedFeedback = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 120) return true;
  if (/[:\-]\s*$/.test(trimmed)) return true;
  if (!/[.!?…'"”’)]$/.test(trimmed)) return true;
  return false;
};

const normalizeLlamaResult = (raw = {}) => {
  const taskScore = clampScore05(raw.taskScore ?? raw.task ?? raw.criteria?.task);
  const grammarScore = clampScore05(raw.grammarScore ?? raw.grammar ?? raw.criteria?.grammar);
  const vocabularyScore = clampScore05(
    raw.vocabularyScore ?? raw.vocabulary ?? raw.criteria?.vocabulary
  );
  const organizationScore = clampScore05(
    raw.organizationScore ?? raw.organization ?? raw.criteria?.organization
  );

  const hasCriteria = [taskScore, grammarScore, vocabularyScore, organizationScore].some(
    (n) => Number.isFinite(n) && n > 0
  );
  const avgCriteria = hasCriteria
    ? (taskScore + grammarScore + vocabularyScore + organizationScore) / 4
    : 0;

  const overallScore = clampScore05(
    raw.overallScore ?? raw.overall ?? raw.score ?? avgCriteria
  );

  const { predicted, level } = snapToeicScore(
    raw.predictedToeicScore ?? raw.toeicScore ?? raw.predicted_toeic,
    overallScore
  );

  let feedback =
    normalizeFeedbackText(raw.feedback) ||
    normalizeFeedbackText(raw.summary) ||
    normalizeFeedbackText(raw.comment) ||
    "";
  const fallbackFb = buildFeedback({
    taskScore,
    grammarScore,
    vocabularyScore,
    organizationScore,
  });
  if (!feedback || isTruncatedFeedback(feedback)) {
    const cleaned = feedback.replace(/[:\-]\s*$/, "").trim();
    feedback = cleaned ? `${cleaned}. ${fallbackFb}` : fallbackFb;
  }

  return {
    ok: true,
    taskScore,
    grammarScore,
    vocabularyScore,
    organizationScore,
    overallScore,
    overall: overallScore,
    predictedToeicScore: predicted,
    toeicWritingLevel: level,
    criteria: {
      task: taskScore,
      grammar: grammarScore,
      vocabulary: vocabularyScore,
      organization: organizationScore,
    },
    feedback,
    studyPlan: normalizeStudyList(raw.studyPlan, normalizeStudyList(raw.suggestions, [])),
    suggestions: normalizeStudyList(raw.suggestions, []),
    studyPlan:
      normalizeStudyList(raw.studyPlan, normalizeStudyList(raw.suggestions, [])) ||
      buildStudyPlan({ taskScore, grammarScore, vocabularyScore, organizationScore }),
    summary: normalizeFeedbackText(raw.summary),
    raw,
  };
};

const parseJsonFromText = (text) => {
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch (_) {
    // continue
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const jsonSlice = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSlice);
    } catch (_) {
      // continue
    }
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  throw new Error("Cannot parse JSON from model response");
};

const systemPrompt = `
Bạn là giám khảo TOEIC Writing, chấm từng câu (0-5). Tính predictedToeicScore trong khoảng 0-200, quy đổi từ overall*40 và bám theo các band:
- Level 1: 0-30 | Level 2: 40-50 | Level 3: 60-70 | Level 4: 80-100
- Level 5: 110-130 | Level 6: 140-160 | Level 7: 170 | Level 8: 180-200

YÊU CẦU ĐẦU RA:
- Chỉ trả về JSON thuần, không giải thích thêm.
- Feedback ~100-170 từ, giọng thân thiện/khoa học, không phán xét; nêu 1-2 điểm mạnh, 2-3 lỗi cụ thể (ngữ pháp/từ vựng/tổ chức), gợi ý viết lại/ví dụ ngắn, khích lệ cải thiện.
- StudyPlan: 3-6 gợi ý hành động cụ thể để cải thiện câu trả lời này, ngắn gọn, dễ làm.
- Mẫu JSON:
{
  "taskScore": number,            // 0-5
  "grammarScore": number,         // 0-5
  "vocabularyScore": number,      // 0-5
  "organizationScore": number,    // 0-5
  "overallScore": number,         // 0-5
  "predictedToeicScore": number,  // 0-200
  "feedback": "Nhận xét 100-170 từ, giọng thân thiện/khoa học",
  "studyPlan": ["Gợi ý 1", "Gợi ý 2", "Gợi ý 3"]
}
- Bắt buộc giữ đúng key, điểm phải nằm trong biên 0-5 và 0-200.
`.trim();

app.post("/local-writing-score", async (req, res) => {
  const { answerText = "", questionText = "" } = req.body || {};
  if (!answerText.trim()) {
    return res.status(400).json({ ok: false, msg: "Thiếu bài làm" });
  }
  try {
    const userPrompt = `Đề bài:\n${questionText}\n\nBài làm:\n${answerText}\n\nHãy chấm và trả về JSON đúng mẫu.`;
    const reply = await ollama.generate({
      model: MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      format: "json",
      options: { temperature: 0.25 },
    });

    const text = reply?.response || "";
    const parsed = parseJsonFromText(text);
    const normalized = normalizeLlamaResult(parsed);
    return res.json(normalized);
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
