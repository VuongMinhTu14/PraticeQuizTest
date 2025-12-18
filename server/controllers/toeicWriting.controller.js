// controllers/toeicWriting.controller.js
import fs from "fs";
import path from "path";
import ToeicWritingSet from "../models/toeicWritingSet.model.js";
import ToeicWritingQuestion from "../models/toeicWritingQuestion.model.js";
import ToeicWritingAttempt from "../models/toeicWritingAttempt.model.js";
import gradeWriting from "../utils/writingGrader.js";

const WRITING_IMAGE_DIR = path.join(process.cwd(), "uploads", "toeic-writing");

const DEFAULT_WRITING_PARTS = [
  { key: "w1_5", name: "Questions 1-5 - Picture description", questions: 5, tags: [], order: 1 },
  { key: "w6_7", name: "Questions 6-7 - Email response", questions: 2, tags: [], order: 2 },
  { key: "w8", name: "Question 8 - Opinion essay", questions: 1, tags: [], order: 3 },
];

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

const clampToeicScore = (val, fallbackOverall = 0) => {
  const snap = (score) => Math.round(Math.max(0, Math.min(200, score)) / 10) * 10;

  const base =
    Number.isFinite(Number(val)) && Number(val) > 0
      ? Number(val)
      : Number.isFinite(Number(fallbackOverall))
        ? Number(fallbackOverall) * 40
        : 0;

  const snapped = snap(base);
  const band =
    TOEIC_WRITING_LEVELS.find((b) => snapped <= b.max) ||
    TOEIC_WRITING_LEVELS[TOEIC_WRITING_LEVELS.length - 1];
  return Math.min(band.max, Math.max(band.min, snapped));
};

const snapToeicScore = (val, fallbackOverall = 0) => {
  const score = clampToeicScore(val, fallbackOverall);
  const band =
    TOEIC_WRITING_LEVELS.find((b) => score <= b.max) ||
    TOEIC_WRITING_LEVELS[TOEIC_WRITING_LEVELS.length - 1];
  return { score, level: band.level };
};

const clampScore05 = (v) => {
  const num = Number(v);
  if (!Number.isFinite(num)) return 0;
  return Math.min(5, Math.max(0, Math.round(num * 100) / 100));
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
  if (/[:\-]\s*$/.test(trimmed)) return true; // kết thúc bằng dấu hai chấm/gạch đầu dòng
  if (!/[.!?…'"”’)]$/.test(trimmed)) return true; // thiếu dấu kết câu
  return false;
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
      : "Điểm mạnh: bạn đã giữ giọng văn thân thiện và cố gắng diễn đạt đủ ý.";
  const weakPart =
    weak.length > 0
      ? `Điểm cần cải thiện: ${weak.join("; ")}.`
      : "Điểm cần cải thiện: thử thêm cấu trúc đa dạng và ví dụ cụ thể để bài viết sinh động hơn.";
  const examples = [
    "Ví dụ: mở bài bằng 1 câu khung rõ, thêm chi tiết cụ thể để minh họa.",
    "Khi diễn đạt lại, thêm từ nối (however, moreover, for example) để mạch văn tự nhiên hơn.",
  ];
  const planTip =
    "Kế hoạch nhỏ: (1) Gạch ý chính và ví dụ trước khi viết. (2) Viết câu ngắn 12-18 từ, soát lỗi mạo từ/chủ-vị. (3) Đọc lại, thêm từ nối và kiểm tra kết bài.";
  const encourage =
    "Mỗi lỗi chỉ là điểm neo để luyện tập; bạn đã có nền tảng, hãy kiên trì bổ sung ý và soát lại trước khi nộp.";
  return `${strongPart} ${weakPart} ${examples.join(" ")} ${planTip} ${encourage}`;
};

const buildStudyPlan = ({ taskScore, grammarScore, vocabularyScore, organizationScore }) => {
  const tips = [];
  if (taskScore < 4) tips.push("Đọc kỹ yêu cầu, gạch ý chính, kiểm tra đủ ý trước khi nộp.");
  if (grammarScore < 4) tips.push("Ôn thì cơ bản, soát lỗi chủ-vị/mạo từ, rút ngắn câu dài.");
  if (vocabularyScore < 4) tips.push("Thêm từ nối và paraphrase, tránh lặp từ khóa, dùng collocation quen.");
  if (organizationScore < 4) tips.push("Chia đoạn rõ, mỗi đoạn 1 ý chính, thêm câu chủ đề và câu kết.");
  tips.push("Đọc lại, sửa lỗi chính tả/ngắt câu, thay 1-2 cấu trúc đa dạng hơn.");
  return [...new Set(tips)].slice(0, 6);
};

const normalizeLlamaScore = (ai = {}) => {
  const taskScore = clampScore05(ai.taskScore ?? ai.task ?? ai.criteria?.task);
  const grammarScore = clampScore05(ai.grammarScore ?? ai.grammar ?? ai.criteria?.grammar);
  const vocabularyScore = clampScore05(
    ai.vocabularyScore ?? ai.vocabulary ?? ai.criteria?.vocabulary
  );
  const organizationScore = clampScore05(
    ai.organizationScore ?? ai.organization ?? ai.criteria?.organization
  );

  const hasCriteria = [taskScore, grammarScore, vocabularyScore, organizationScore].some(
    (n) => Number.isFinite(n) && n > 0
  );
  const avgCriteria = hasCriteria
    ? (taskScore + grammarScore + vocabularyScore + organizationScore) / 4
    : 0;

  const overallScore = clampScore05(ai.overallScore ?? ai.overall ?? ai.score ?? avgCriteria);
  const { score: predictedToeicScore, level: toeicWritingLevel } = snapToeicScore(
    ai.predictedToeicScore ?? ai.toeicScore ?? ai.predicted_toeic,
    overallScore
  );

  let feedback =
    normalizeFeedbackText(ai.feedback) ||
    normalizeFeedbackText(ai.summary) ||
    normalizeFeedbackText(ai.comment) ||
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
    taskScore,
    grammarScore,
    vocabularyScore,
    organizationScore,
    overallScore,
    overall: overallScore,
    predictedToeicScore,
    toeicWritingLevel,
    criteria: {
      task: taskScore,
      grammar: grammarScore,
      vocabulary: vocabularyScore,
      organization: organizationScore,
    },
    feedback,
    studyPlan:
      normalizeStudyList(ai.studyPlan, normalizeStudyList(ai.suggestions, [])) ||
      buildStudyPlan({ taskScore, grammarScore, vocabularyScore, organizationScore }),
    suggestions: normalizeStudyList(ai.suggestions, []),
    summary: normalizeFeedbackText(ai.summary),
    raw: ai,
  };
};

/* =========================
 * USER SIDE - PRACTICE WRITING
 * ========================= */

// GET /toeic-writing/sets
export const listWritingSets = async (_req, res) => {
  try {
    const docs = await ToeicWritingSet.find({}).sort({ year: -1, _id: 1 }).lean();
    const items = docs.map((d) => ({
      id: d._id,
      title: d.title,
      taskType: d.taskType,
      year: d.year,
      status: d.status,
    }));
    return res.json({ ok: true, items });
  } catch (err) {
    console.error("listWritingSets error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi lấy danh sách đề writing" });
  }
};

// GET /toeic-writing/sets/:id
export const getWritingSet = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await ToeicWritingSet.findById(id).lean();
    if (!doc) return res.status(404).json({ ok: false, msg: "Không tìm thấy đề writing" });

    const data = {
      id: doc._id,
      title: doc.title,
      taskType: doc.taskType,
      prompt: doc.prompt,
      instructions: doc.instructions,
      minWords: doc.minWords,
      maxWords: doc.maxWords,
      maxScore: doc.maxScore,
      year: doc.year,
      source: doc.source,
      status: doc.status,
      rubric: doc.rubric,
      parts: doc.parts && doc.parts.length > 0 ? doc.parts : DEFAULT_WRITING_PARTS,
    };

    return res.json({ ok: true, data });
  } catch (err) {
    console.error("getWritingSet error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi lấy đề writing" });
  }
};

// POST /toeic-writing/sets/:id/attempts
export const createWritingAttempt = async (req, res) => {
  try {
    const setId = req.params.id;
    const { selectedParts = [], timeLimitSec = null } = req.body || {};

    const set = await ToeicWritingSet.findById(setId);
    if (!set) return res.status(404).json({ ok: false, msg: "Đề writing không tồn tại" });

    const parts = selectedParts.length ? selectedParts : (set.parts || []).map((p) => p.key);
    if (!parts.length) {
      return res.status(400).json({ ok: false, msg: "Đề chưa có cấu hình parts để luyện" });
    }

    const mode = parts.length === (set.parts || []).length ? "full" : "part";

    const doc = await ToeicWritingAttempt.create({
      userId: req.user?.id,
      setId,
      mode,
      selectedParts: parts,
      timeLimitSec: timeLimitSec || null,
    });

    res.status(201).json({ ok: true, attemptId: doc._id.toString() });
  } catch (err) {
    console.error("createWritingAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Không tạo được bài writing" });
  }
};

// GET /toeic-writing/attempts/:attemptId
export const getWritingAttempt = async (req, res) => {
  try {
    const attemptId = req.params.id || req.params.attemptId;
    const at = await ToeicWritingAttempt.findById(attemptId)
      .populate("userId", "fullName")
      .lean();

    if (!at) return res.status(404).json({ ok: false, msg: "Không tìm thấy attempt writing" });

    const set = await ToeicWritingSet.findById(at.setId).lean();

    res.json({
      ok: true,
      data: {
        id: at._id,
        setId: at.setId,
        setTitle: set?.title || "",
        mode: at.mode,
        selectedParts: at.selectedParts,
        timeLimitSec: at.timeLimitSec,
        isSubmitted: at.isSubmitted,
        summary: at.summary,
        llamaResult: at.llamaResult || null,
        submissionMethod: at.submissionMethod || null,
        createdAt: at.createdAt,
      },
    });
  } catch (err) {
    console.error("getWritingAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Không tải được attempt" });
  }
};

// GET /toeic-writing/sets/:setId/questions
export const getWritingQuestions = async (req, res) => {
  try {
    const { setId } = req.params;
    const partKey = req.query.part || req.query.partKey || req.params.partKey;
    if (!setId) return res.status(400).json({ ok: false, msg: "Thiếu setId" });

    const filter = { setId };
    if (partKey) filter.partKey = partKey;

    const list = await ToeicWritingQuestion.find(filter).sort({ number: 1 }).lean();
    const data = list.map((q) => ({
      id: q._id,
      setId: q.setId,
      number: q.number,
      partKey: q.partKey,
      taskType: q.taskType,
      prompt: q.prompt,
      imageUrl: q.imageUrl,
      wordPair: q.wordPair,
      instructions: q.instructions,
      minWords: q.minWords,
      maxWords: q.maxWords,
      rubric: q.rubric,
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error("getWritingQuestions error:", err);
    res.status(500).json({ ok: false, msg: "Không tải được câu writing" });
  }
};

// POST /toeic-writing/attempts/:attemptId/submit (Gemini)
export const submitWritingAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers = [] } = req.body || {};

    const at = await ToeicWritingAttempt.findById(attemptId);
    if (!at) return res.status(404).json({ ok: false, msg: "Attempt writing không tồn tại" });

    if (at.isSubmitted) {
      return res.json({
        ok: true,
        data: {
          summary: at.summary,
          submissionMethod: at.submissionMethod || "gemini",
        },
        msg: "Attempt đã nộp trước đó",
      });
    }

    const qIds = answers.map((a) => a.questionId);
    const questions = await ToeicWritingQuestion.find({ _id: { $in: qIds } }).lean();
    const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const answerDocs = [];
    for (const raw of answers) {
      const q = qMap.get(raw.questionId);
      if (!q) continue;

      const text = (raw.answerText || "").trim();
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

      let aiResult = null;
      if (text) {
        try {
          aiResult = await gradeWriting({
            prompt: q.prompt,
            answerText: text,
            rubric: q.rubric,
            level: "TOEIC",
          });
        } catch (err) {
          console.error("gradeWriting error for q", q._id, err);
        }
      }

      answerDocs.push({
        questionId: q._id,
        number: q.number,
        partKey: q.partKey,
        taskType: q.taskType,
        answerText: text,
        wordCount,
        ai: aiResult || undefined,
      });
    }

    const graded = answerDocs.filter((a) => a.ai);
    const n = graded.length || 1;
    const sum = graded.reduce(
      (acc, a) => {
        acc.task += a.ai.taskScore || 0;
        acc.grammar += a.ai.grammarScore || 0;
        acc.vocab += a.ai.vocabularyScore || 0;
        acc.org += a.ai.organizationScore || 0;
        acc.overall += a.ai.overallScore || 0;
        acc.toeic += a.ai.predictedToeicScore || 0;
        return acc;
      },
      { task: 0, grammar: 0, vocab: 0, org: 0, overall: 0, toeic: 0 }
    );

    const predicted = clampToeicScore(sum.toeic / n, sum.overall / n);
    const summary = {
      totalQuestions: at.selectedParts?.includes("w1_5")
        ? 5 + (at.selectedParts.includes("w6_7") ? 2 : 0) + (at.selectedParts.includes("w8") ? 1 : 0)
        : answerDocs.length,
      answered: answerDocs.length,
      avgTaskScore: +(sum.task / n).toFixed(2),
      avgGrammarScore: +(sum.grammar / n).toFixed(2),
      avgVocabularyScore: +(sum.vocab / n).toFixed(2),
      avgOrganizationScore: +(sum.org / n).toFixed(2),
      avgOverallScore: +(sum.overall / n).toFixed(2),
      predictedToeicScore: predicted,
    };

    at.answers = answerDocs;
    at.summary = summary;
    at.llamaResult = null;
    at.submissionMethod = "gemini";
    at.isSubmitted = true;
    at.submittedAt = new Date();
    await at.save();

    await ToeicWritingSet.findByIdAndUpdate(at.setId, { $inc: { "stats.attempts": 1 } });

    res.json({
      ok: true,
      data: {
        attemptId: at._id.toString(),
        setId: at.setId,
        summary,
        answers: answerDocs,
      },
    });
  } catch (err) {
    console.error("submitWritingAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Không nộp được bài writing" });
  }
};

// POST /toeic-writing/attempts/:attemptId/submit-llama
// body: { answers: [{ questionId, answerText, ai? }], llamaAnswers?: [{questionId, ai}], llamaResult?: {...} }
export const submitWritingAttemptLlama = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers = [], llamaAnswers = [], llamaResult = null } = req.body || {};

    const at = await ToeicWritingAttempt.findById(attemptId);
    if (!at) return res.status(404).json({ ok: false, msg: "Attempt writing không tồn tại" });

    if (at.isSubmitted) {
      return res.json({
        ok: true,
        data: {
          attemptId: at._id.toString(),
          setId: at.setId,
          summary: at.summary,
          llamaResult: at.llamaResult || null,
          answers: at.answers || [],
          submissionMethod: at.submissionMethod || null,
          msg: "Attempt đã nộp trước đó",
        },
      });
    }

    const qIds = answers.map((a) => a.questionId);
    const questions = await ToeicWritingQuestion.find({ _id: { $in: qIds } }).lean();
    const qMap = new Map(questions.map((q) => [q._id.toString(), q]));
    const llamaMap = new Map((llamaAnswers || []).map((la) => [String(la.questionId), la.ai || la]));

    const answerDocs = [];
    for (const raw of answers) {
      const q = qMap.get(raw.questionId);
      if (!q) continue;
      const text = (raw.answerText || "").trim();
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const aiRaw = raw.ai || llamaMap.get(String(raw.questionId)) || null;
      const ai = aiRaw ? normalizeLlamaScore(aiRaw) : null;

      answerDocs.push({
        questionId: q._id,
        number: q.number,
        partKey: q.partKey,
        taskType: q.taskType,
        answerText: text,
        wordCount,
        ai: ai || undefined,
      });
    }

    const graded = answerDocs.filter((a) => a.ai);
    const n = graded.length || 1;
    const sum = graded.reduce(
      (acc, a) => {
        acc.task += a.ai.taskScore || 0;
        acc.grammar += a.ai.grammarScore || 0;
        acc.vocab += a.ai.vocabularyScore || 0;
        acc.org += a.ai.organizationScore || 0;
        acc.overall += a.ai.overallScore ?? a.ai.overall ?? 0;
        acc.toeic += a.ai.predictedToeicScore || 0;
        return acc;
      },
      { task: 0, grammar: 0, vocab: 0, org: 0, overall: 0, toeic: 0 }
    );

    const crit = {
      task: Number((sum.task / n).toFixed(2)),
      grammar: Number((sum.grammar / n).toFixed(2)),
      vocabulary: Number((sum.vocab / n).toFixed(2)),
      organization: Number((sum.org / n).toFixed(2)),
    };

    const normalizedPayload = llamaResult ? normalizeLlamaScore(llamaResult) : null;
    const avgOverall = Number((sum.overall / n).toFixed(2));
    const toeicSnap = snapToeicScore(
      normalizedPayload?.predictedToeicScore ?? sum.toeic / n,
      normalizedPayload?.overallScore ?? avgOverall
    );

    const normalizedLlama = {
      overall: normalizedPayload?.overallScore ?? avgOverall,
      overallScore: normalizedPayload?.overallScore ?? avgOverall,
      predictedToeicScore: toeicSnap.score,
      toeicWritingLevel: normalizedPayload?.toeicWritingLevel ?? toeicSnap.level,
      criteria: crit,
      feedback: normalizedPayload?.feedback || "",
      studyPlan: normalizedPayload?.studyPlan || [],
      suggestions: normalizedPayload?.suggestions || [],
      summary: normalizedPayload?.summary || normalizedPayload?.feedback || "",
      raw: normalizedPayload?.raw || llamaResult || null,
    };

    const summary = {
      totalQuestions: answerDocs.length,
      answered: answerDocs.length,
      avgTaskScore: crit.task,
      avgGrammarScore: crit.grammar,
      avgVocabularyScore: crit.vocabulary,
      avgOrganizationScore: crit.organization,
      avgOverallScore: normalizedLlama.overallScore,
      predictedToeicScore: normalizedLlama.predictedToeicScore,
    };

    at.answers = answerDocs;
    at.summary = summary;
    at.llamaResult = normalizedLlama;
    at.submissionMethod = "llama";
    at.isSubmitted = true;
    at.submittedAt = new Date();
    await at.save();
    await ToeicWritingSet.findByIdAndUpdate(at.setId, { $inc: { "stats.attempts": 1 } });

    return res.json({
      ok: true,
      data: {
        attemptId: at._id.toString(),
        setId: at.setId,
        summary,
        llamaResult: at.llamaResult,
        answers: answerDocs,
        submissionMethod: "llama",
      },
    });
  } catch (err) {
    console.error("submitWritingAttemptLlama error:", err);
    res.status(500).json({ ok: false, msg: "Không nộp được bài writing (Llama)" });
  }
};

/* =========================
 * ADMIN - SETS
 * ========================= */

export const adminListWritingSets = async (_req, res) => {
  try {
    const docs = await ToeicWritingSet.find({}).sort({ year: -1, _id: 1 }).lean();
    const items = docs.map((d) => ({
      _id: d._id,
      title: d.title,
      taskType: d.taskType,
      prompt: d.prompt,
      instructions: d.instructions,
      minWords: d.minWords,
      maxWords: d.maxWords,
      year: d.year,
      source: d.source,
      maxScore: d.maxScore,
      rubric: d.rubric,
      tags: d.tags || [],
      status: d.status,
      parts: d.parts,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
    return res.json({ ok: true, items });
  } catch (err) {
    console.error("adminListWritingSets error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi lấy danh sách đề writing" });
  }
};

export const adminCreateWritingSet = async (req, res) => {
  try {
    const {
      _id,
      title,
      taskType,
      prompt,
      instructions,
      minWords,
      maxWords,
      year,
      source,
      maxScore,
      rubric,
      tags,
      status,
    } = req.body;

    if (!_id || !title || !prompt) {
      return res
        .status(400)
        .json({ ok: false, msg: "Mã đề (_id), tiêu đề (title) và đề bài (prompt) là bắt buộc" });
    }

    const existed = await ToeicWritingSet.findById(_id);
    if (existed) {
      return res.status(400).json({ ok: false, msg: "Mã đề writing đã tồn tại" });
    }

    const doc = await ToeicWritingSet.create({
      _id,
      title,
      taskType: taskType || "mixed",
      prompt,
      instructions,
      minWords: minWords ?? 120,
      maxWords: maxWords ?? 180,
      year,
      source,
      maxScore: maxScore ?? 200,
      rubric,
      tags: Array.isArray(tags) ? tags : [],
      status: status || "draft",
      parts: DEFAULT_WRITING_PARTS,
    });

    return res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (err) {
    console.error("adminCreateWritingSet error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi tạo đề writing" });
  }
};

export const adminUpdateWritingSet = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      title,
      taskType,
      prompt,
      instructions,
      minWords,
      maxWords,
      year,
      source,
      maxScore,
      rubric,
      tags,
      status,
      parts,
    } = req.body;

    const doc = await ToeicWritingSet.findById(id);
    if (!doc) return res.status(404).json({ ok: false, msg: "Không tìm thấy đề writing" });

    doc.title = title ?? doc.title;
    doc.taskType = taskType ?? doc.taskType;
    doc.prompt = prompt ?? doc.prompt;
    doc.instructions = instructions ?? doc.instructions;
    doc.minWords = minWords ?? doc.minWords;
    doc.maxWords = maxWords ?? doc.maxWords;
    doc.year = year ?? doc.year;
    doc.source = source ?? doc.source;
    doc.maxScore = maxScore ?? doc.maxScore;
    doc.rubric = rubric ?? doc.rubric;
    if (Array.isArray(tags)) doc.tags = tags;
    doc.status = status ?? doc.status;
    if (Array.isArray(parts) && parts.length > 0) doc.parts = parts;

    await doc.save();
    return res.json({ ok: true, data: { id: doc._id } });
  } catch (err) {
    console.error("adminUpdateWritingSet error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi cập nhật đề writing" });
  }
};

export const adminDeleteWritingSet = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await ToeicWritingSet.findById(id);
    if (!doc) return res.status(404).json({ ok: false, msg: "Không tìm thấy đề writing" });

    await doc.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error("adminDeleteWritingSet error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi xoá đề writing" });
  }
};

/* =========================
 * ADMIN - QUESTIONS
 * ========================= */

export const adminListWritingQuestions = async (req, res) => {
  try {
    const setId = req.params.setId || req.query.setId;
    const partKey = req.query.partKey || req.query.part;
    if (!setId) return res.status(400).json({ ok: false, msg: "Thiếu setId" });

    const filter = { setId };
    if (partKey) filter.partKey = partKey;

    const docs = await ToeicWritingQuestion.find(filter).sort({ number: 1 }).lean();
    res.json({ ok: true, data: docs });
  } catch (err) {
    console.error("adminListWritingQuestions error:", err);
    res.status(500).json({ ok: false, msg: "Không tải được câu writing" });
  }
};

export const adminCreateWritingQuestion = async (req, res) => {
  try {
    const { setId } = req.params;
    const {
      partKey,
      number,
      taskType,
      prompt,
      imageUrl,
      wordPair,
      instructions,
      minWords,
      maxWords,
      rubric,
      groupKey,
      tags,
    } = req.body;

    if (!setId || !partKey || !number || !taskType || !prompt) {
      return res
        .status(400)
        .json({ ok: false, msg: "Thiếu setId / partKey / number / taskType / prompt" });
    }

    const doc = await ToeicWritingQuestion.create({
      setId,
      partKey,
      number,
      taskType,
      prompt,
      imageUrl,
      wordPair,
      instructions,
      minWords,
      maxWords,
      rubric,
      groupKey,
      tags,
    });

    return res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    console.error("adminCreateWritingQuestion error:", err);
    return res.status(500).json({ ok: false, msg: "Tạo câu writing thất bại" });
  }
};

const inferTaskTypeFromPart = (partKey) => {
  if (partKey === "w1_5") return "picture";
  if (partKey === "w6_7") return "email";
  if (partKey === "w8") return "opinion_essay";
  return "other";
};

export const adminImportWritingQuestions = async (req, res) => {
  try {
    const { setId } = req.params;
    const { partKey, questions } = req.body || {};
    if (!setId || !partKey || !Array.isArray(questions)) {
      return res.status(400).json({ ok: false, msg: "Thiếu setId / partKey / questions" });
    }

    await ToeicWritingQuestion.deleteMany({ setId, partKey });
    const taskType = inferTaskTypeFromPart(partKey);

    const docs = questions.map((q, idx) => {
      let number = q.number;
      if (number == null) {
        if (partKey === "w1_5") number = idx + 1;
        else if (partKey === "w6_7") number = 6 + idx;
        else if (partKey === "w8") number = 8;
        else number = idx + 1;
      }
      return {
        setId,
        partKey,
        number,
        taskType: q.taskType || taskType,
        prompt: q.prompt || "",
        wordPair: q.subPrompt || q.wordPair || "",
        imageUrl: q.imageUrl || "",
        instructions: q.instructions || "",
        minWords: typeof q.minWords === "number" ? q.minWords : q.minWords ?? 0,
        maxWords: typeof q.maxWords === "number" ? q.maxWords : q.maxWords ?? 300,
        rubric: q.rubric || "",
        groupKey: q.groupKey || "",
        tags: q.tags || [],
      };
    });

    await ToeicWritingQuestion.insertMany(docs);
    return res.json({ ok: true, msg: "Import câu Writing thành công", count: docs.length });
  } catch (err) {
    console.error("adminImportWritingQuestions error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi import" });
  }
};

export const adminUpdateWritingQuestion = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await ToeicWritingQuestion.findByIdAndUpdate(id, req.body, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, msg: "Câu writing không tồn tại" });
    return res.json({ ok: true, data: doc });
  } catch (err) {
    console.error("adminUpdateWritingQuestion error:", err);
    return res.status(500).json({ ok: false, msg: "Cập nhật câu writing thất bại" });
  }
};

export const adminDeleteWritingQuestion = async (req, res) => {
  try {
    await ToeicWritingQuestion.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("adminDeleteWritingQuestion error:", err);
    res.status(500).json({ ok: false, msg: "Xoá câu writing thất bại" });
  }
};

export const adminUploadWritingQuestionImage = async (req, res) => {
  try {
    const questionId = req.params.id;
    const file = req.files?.file || req.files?.image;
    if (!file) return res.status(400).json({ ok: false, msg: "Không có file để upload" });

    const ext = path.extname(file.name) || ".jpg";
    const fileName = `wq_${questionId}_${Date.now()}${ext}`;
    const savePath = path.join(WRITING_IMAGE_DIR, fileName);
    await fs.promises.mkdir(WRITING_IMAGE_DIR, { recursive: true });
    await file.mv(savePath);

    const publicUrl = `/uploads/toeic-writing/${fileName}`;
    const doc = await ToeicWritingQuestion.findByIdAndUpdate(
      questionId,
      { imageUrl: publicUrl },
      { new: true }
    );
    if (!doc) return res.status(404).json({ ok: false, msg: "Không tìm thấy câu Writing" });

    return res.json({ ok: true, data: { imageUrl: publicUrl } });
  } catch (err) {
    console.error("adminUploadWritingQuestionImage error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi upload ảnh câu hỏi" });
  }
};

export const getWritingLastAttempt = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, msg: "Cần đăng nhập" });

    const setId = req.params.id;
    const last = await ToeicWritingAttempt.findOne({
      userId,
      setId,
      isSubmitted: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ok: true, data: last || null });
  } catch (err) {
    console.error("getWritingLastAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi lấy attempt gần nhất" });
  }
};

export const getMyWritingRecentAttempts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, msg: "Cần đăng nhập" });

    const days = Number(req.query.days || 30);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const list = await ToeicWritingAttempt.find({
      userId,
      createdAt: { $gte: from },
      isSubmitted: true,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const setIds = [...new Set(list.map((a) => a.setId))];
    const sets = await ToeicWritingSet.find({ _id: { $in: setIds } }).lean();
    const setMap = new Map(sets.map((s) => [s._id.toString(), s.title]));

    const items = list.map((a) => ({
      id: a._id,
      createdAt: a.createdAt,
      setId: a.setId,
      setTitle: setMap.get(a.setId.toString()) || "Đề không tên",
      predictedToeicScore: a.summary?.predictedToeicScore ?? null,
      overallScore: a.summary?.avgOverallScore ?? null,
      toeicWritingLevel: a.summary
        ? Math.ceil(a.summary.predictedToeicScore / 25)
        : null,
      summary: a.summary,
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("getMyWritingRecentAttempts error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi lấy lịch sử writing" });
  }
};

// GET /toeic-writing/attempts/:id/review
export const getWritingAttemptReview = async (req, res) => {
  try {
    const attemptId = req.params.id;
    const at = await ToeicWritingAttempt.findById(attemptId).lean();
    if (!at) return res.status(404).json({ ok: false, msg: "Không tìm thấy attempt" });

    const set = await ToeicWritingSet.findById(at.setId).lean();

    const questions = await ToeicWritingQuestion.find({
      setId: at.setId,
      partKey: { $in: at.selectedParts },
    })
      .sort({ number: 1 })
      .lean();

    const answerMap = new Map((at.answers || []).map((a) => [a.questionId.toString(), a]));

    const items = questions.map((q) => ({
      questionId: q._id,
      number: q.number,
      partKey: q.partKey,
      prompt: q.prompt,
      imageUrl: q.imageUrl,
      instructions: q.instructions,
      minWords: q.minWords,
      maxWords: q.maxWords,
      answerText: answerMap.get(q._id.toString())?.answerText || "",
      wordCount: answerMap.get(q._id.toString())?.wordCount || 0,
      ai: answerMap.get(q._id.toString())?.ai || null,
    }));

    return res.json({
      ok: true,
      data: {
        attempt: {
          id: at._id,
          setId: at.setId,
          setTitle: set?.title || "",
          summary: at.summary,
          llamaResult: at.llamaResult || null,
          submissionMethod: at.submissionMethod || null,
          createdAt: at.createdAt,
          submittedAt: at.submittedAt,
        },
        items,
      },
    });
  } catch (err) {
    console.error("getWritingAttemptReview error:", err);
    return res.status(500).json({ ok: false, msg: "Không load được review" });
  }
};
