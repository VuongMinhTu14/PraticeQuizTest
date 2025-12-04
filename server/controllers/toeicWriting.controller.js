// controllers/toeicWriting.controller.js
import ToeicWritingSet from "../models/toeicWritingSet.model.js";
import ToeicWritingQuestion from "../models/toeicWritingQuestion.model.js";
import ToeicWritingAttempt from "../models/toeicWritingAttempt.model.js";
import gradeWriting from "../utils/writingGrader.js"; // :contentReference[oaicite:3]{index=3}
import fs from "fs";
import path from "path";
const WRITING_IMAGE_DIR = path.join(process.cwd(), "uploads", "toeic-writing");

const DEFAULT_WRITING_PARTS = [
  {
    key: "w1_5",
    name: "Questions 1–5 - Picture description",
    questions: 5,
    tags: [],
    order: 1,
  },
  {
    key: "w6_7",
    name: "Questions 6–7 - Email response",
    questions: 2,
    tags: [],
    order: 2,
  },
  {
    key: "w8",
    name: "Question 8 - Opinion essay",
    questions: 1,
    tags: [],
    order: 3,
  },
];

/* =========================
 * USER SIDE – PRACTICE WRITING
 * ========================= */

// GET /toeic-writing/sets
// GET /toeic-writing/sets
export const listWritingSets = async (req, res) => {
  try {
    const docs = await ToeicWritingSet.find({})
      .sort({ year: -1, _id: 1 })
      .lean();

    const items = docs.map((d) => ({
      id: d._id,
      title: d.title,
      taskType: d.taskType,
      year: d.year,
      status: d.status,
      // bạn có thể thêm stats nếu sau này có
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("listWritingSets error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi server khi lấy danh sách đề writing" });
  }
};

// GET /toeic-writing/sets/:id
export const getWritingSet = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await ToeicWritingSet.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy đề writing" });
    }

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
      parts: doc.parts && doc.parts.length > 0
        ? doc.parts
        : DEFAULT_WRITING_PARTS,
    };

    return res.json({ ok: true, data });
  } catch (err) {
    console.error("getWritingSet error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi server khi lấy đề writing" });
  }
};


// POST /toeic-writing/sets/:id/attempts
// body: { selectedParts: ["w1_5",...], timeLimitSec: number|null }
export const createWritingAttempt = async (req, res) => {
  try {
    const setId = req.params.id;
    const { selectedParts = [], timeLimitSec = null } = req.body || {};

    const set = await ToeicWritingSet.findById(setId);
    if (!set)
      return res.status(404).json({ ok: false, msg: "Đề writing không tồn tại" });

    const parts = selectedParts.length
      ? selectedParts
      : (set.parts || []).map((p) => p.key);

    if (!parts.length) {
      return res
        .status(400)
        .json({ ok: false, msg: "Đề chưa cấu hình parts để luyện" });
    }

    const mode = parts.length === (set.parts || []).length ? "full" : "part";

    const doc = await ToeicWritingAttempt.create({
      userId: req.user?.id, // cần middleware verifyToken gán user
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
    const attemptId = req.params.id || req.params.attemptId; // <<< THÊM DÒNG NÀY

    const at = await ToeicWritingAttempt.findById(attemptId)
      .populate("userId", "fullName")
      .lean();

    if (!at) {
      return res
        .status(404)
        .json({ ok: false, msg: "Không tìm thấy attempt writing" });
    }

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
        createdAt: at.createdAt,
      },
    });
  } catch (err) {
    console.error("getWritingAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Không tải được attempt" });
  }
};

// GET /toeic-writing/sets/:setId/questions
//  - ?part=w1_5 (optional) => chỉ 1 part
export const getWritingQuestions = async (req, res) => {
  try {
    const { setId } = req.params;
    const partKey =
      req.query.part || req.query.partKey || req.params.partKey; // optional

    if (!setId) {
      return res
        .status(400)
        .json({ ok: false, msg: "Thiếu setId để lấy câu hỏi writing" });
    }

    const filter = { setId };
    if (partKey) filter.partKey = partKey; // CHỈ filter theo part nếu có truyền

    const list = await ToeicWritingQuestion.find(filter)
      .sort({ number: 1 })
      .lean();

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
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error("getWritingQuestions error:", err);
    res.status(500).json({ ok: false, msg: "Không tải được câu writing" });
  }
};

// POST /toeic-writing/attempts/:attemptId/submit
// body: { answers: [ { questionId, answerText } ] }
export const submitWritingAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers = [] } = req.body || {};

    const at = await ToeicWritingAttempt.findById(attemptId);
    if (!at)
      return res
        .status(404)
        .json({ ok: false, msg: "Attempt writing không tồn tại" });

    if (at.isSubmitted) {
      return res.json({
        ok: true,
        data: at.summary,
        msg: "Attempt đã nộp trước đó",
      });
    }

    const qIds = answers.map((a) => a.questionId);
    const questions = await ToeicWritingQuestion.find({
      _id: { $in: qIds },
    }).lean();

    const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const answerDocs = [];
    for (const raw of answers) {
      const q = qMap.get(raw.questionId);
      if (!q) continue;

      const text = (raw.answerText || "").trim();
      const wordCount = text
        ? text.split(/\s+/).filter(Boolean).length
        : 0;

      // gọi AI chấm từng câu (dùng writingGrader.js) :contentReference[oaicite:4]{index=4}
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

    // tổng kết điểm
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

    const summary = {
      totalQuestions: at.selectedParts?.includes("w1_5")
        ? 5 +
          (at.selectedParts.includes("w6_7") ? 2 : 0) +
          (at.selectedParts.includes("w8") ? 1 : 0)
        : answerDocs.length,
      answered: answerDocs.length,

      avgTaskScore: +(sum.task / n).toFixed(2),
      avgGrammarScore: +(sum.grammar / n).toFixed(2),
      avgVocabularyScore: +(sum.vocab / n).toFixed(2),
      avgOrganizationScore: +(sum.org / n).toFixed(2),
      avgOverallScore: +(sum.overall / n).toFixed(2),
      predictedToeicScore: Math.round(sum.toeic / n),
    };

    at.answers = answerDocs;
    at.summary = summary;
    at.isSubmitted = true;
    at.submittedAt = new Date();
    await at.save();

    // tăng stats đề
    await ToeicWritingSet.findByIdAndUpdate(at.setId, {
      $inc: { "stats.attempts": 1 },
    });

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

/* =========================
 * ADMIN – SETS
 * dùng cho ToeicWritingAdmin.jsx :contentReference[oaicite:5]{index=5}
 * ========================= */

// GET /toeic-writing/admin/sets
export const adminListWritingSets = async (req, res) => {
  try {
    const docs = await ToeicWritingSet.find({})
      .sort({ year: -1, _id: 1 })
      .lean();

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
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi server khi lấy danh sách đề writing" });
  }
};

// POST /toeic-writing/admin/sets
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
      return res.status(400).json({
        ok: false,
        msg: "Mã đề (_id), tiêu đề (title) và đề bài (prompt) là bắt buộc",
      });
    }

    const existed = await ToeicWritingSet.findById(_id);
    if (existed) {
      return res.status(400).json({
        ok: false,
        msg: "Mã đề writing đã tồn tại",
      });
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
      parts: DEFAULT_WRITING_PARTS, // 👈 tạo sẵn 3 part
    });

    return res.status(201).json({
      ok: true,
      data: { id: doc._id },
    });
  } catch (err) {
    console.error("adminCreateWritingSet error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi server khi tạo đề writing" });
  }
};

// PUT /toeic-writing/admin/sets/:id
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
    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy đề writing" });
    }

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
    if (Array.isArray(parts) && parts.length > 0) {
      doc.parts = parts;
    }

    await doc.save();

    return res.json({ ok: true, data: { id: doc._id } });
  } catch (err) {
    console.error("adminUpdateWritingSet error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi server khi cập nhật đề writing" });
  }
};

// DELETE /toeic-writing/admin/sets/:id
export const adminDeleteWritingSet = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await ToeicWritingSet.findById(id);
    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy đề writing" });
    }

    await doc.deleteOne();

    // nếu bạn có model ToeicWritingQuestion / Attempt thì có thể xoá kèm ở đây

    return res.json({ ok: true });
  } catch (err) {
    console.error("adminDeleteWritingSet error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi server khi xoá đề writing" });
  }
};


/* =========================
 * ADMIN – QUESTIONS (giống ToeicQuestionsAdmin) :contentReference[oaicite:6]{index=6}
 * ========================= */

// GET /toeic-writing/admin/sets/:setId/questions?partKey=w1_5
export const adminListWritingQuestions = async (req, res) => {
  try {
    const setId = req.params.setId || req.query.setId;
    const partKey = req.query.partKey || req.query.part;

    if (!setId) {
      return res
        .status(400)
        .json({ ok: false, msg: "Thiếu setId để load câu hỏi" });
    }

    const filter = { setId };
    if (partKey) filter.partKey = partKey;

    const docs = await ToeicWritingQuestion.find(filter)
      .sort({ number: 1 })
      .lean();

    res.json({ ok: true, data: docs });
  } catch (err) {
    console.error("adminListWritingQuestions error:", err);
    res
      .status(500)
      .json({ ok: false, msg: "Không tải được câu writing" });
  }
};

// POST /toeic-writing/admin/sets/:setId/questions
// tạo 1 câu lẻ (nếu sau này cần)
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
      return res.status(400).json({
        ok: false,
        msg: "Thiếu setId / partKey / number / taskType / prompt",
      });
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
    return res
      .status(500)
      .json({ ok: false, msg: "Tạo câu writing thất bại" });
  }
};

const inferTaskTypeFromPart = (partKey) => {
  if (partKey === "w1_5") return "picture";
  if (partKey === "w6_7") return "email";
  if (partKey === "w8") return "opinion_essay";
  return "other";
};

// POST /toeic-writing/admin/sets/:setId/questions/import
export const adminImportWritingQuestions = async (req, res) => {
  try {
    const { setId } = req.params;
    const { partKey, questions } = req.body || {};

    if (!setId || !partKey || !Array.isArray(questions)) {
      return res.status(400).json({
        ok: false,
        msg: "Thiếu setId / partKey / questions",
      });
    }

    // Xoá hết câu cũ của set + part đó để import lại cho dễ
    await ToeicWritingQuestion.deleteMany({ setId, partKey });

    const taskType = inferTaskTypeFromPart(partKey);

    const docs = questions.map((q, idx) => {
      // nếu không truyền number thì tự suy ra
      let number = q.number;
      if (number == null) {
        if (partKey === "w1_5") number = idx + 1;        // 1–5
        else if (partKey === "w6_7") number = 6 + idx;   // 6–7
        else if (partKey === "w8") number = 8;           // 8
        else number = idx + 1;
      }

      return {
        setId,
        partKey,
        number,
        taskType: q.taskType || taskType,
        prompt: q.prompt || "",
        // subPrompt/wordPair: gộp về 1 field wordPair, FE hiển thị subPrompt
        wordPair: q.subPrompt || q.wordPair || "",
        imageUrl: q.imageUrl || "",
        instructions: q.instructions || "",
        minWords:
          typeof q.minWords === "number" ? q.minWords : (q.minWords ?? 0),
        maxWords:
          typeof q.maxWords === "number" ? q.maxWords : (q.maxWords ?? 300),
        rubric: q.rubric || "",
        groupKey: q.groupKey || "",
        tags: q.tags || [],
      };
    });

    await ToeicWritingQuestion.insertMany(docs);

    return res.json({
      ok: true,
      msg: "Import câu Writing thành công",
      count: docs.length,
    });
  } catch (err) {
    console.error("adminImportWritingQuestions error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server khi import" });
  }
};

// PUT /toeic-writing/admin/questions/:id
export const adminUpdateWritingQuestion = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await ToeicWritingQuestion.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, msg: "Câu writing không tồn tại" });
    }

    return res.json({ ok: true, data: doc });
  } catch (err) {
    console.error("adminUpdateWritingQuestion error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Cập nhật câu writing thất bại" });
  }
};

// DELETE /toeic-writing/admin/questions/:id
export const adminDeleteWritingQuestion = async (req, res) => {
  try {
    await ToeicWritingQuestion.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("adminDeleteWritingQuestion error:", err);
    res.status(500).json({ ok: false, msg: "Xoá câu writing thất bại" });
  }
};

// POST /toeic-writing/admin/questions/:id/upload-image
export const adminUploadWritingQuestionImage = async (req, res) => {
  try {
    const questionId = req.params.id;
    const file = req.files?.file || req.files?.image;

    if (!file) {
      return res
        .status(400)
        .json({ ok: false, msg: "Không có file ảnh được gửi lên" });
    }

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

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, msg: "Không tìm thấy câu hỏi Writing" });
    }

    return res.json({
      ok: true,
      data: { imageUrl: publicUrl },
    });
  } catch (err) {
    console.error("adminUploadWritingQuestionImage error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi upload ảnh câu hỏi Writing" });
  }
};

export const getWritingLastAttempt = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, msg: "Cần đăng nhập" });
    }

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
    if (!userId)
      return res.status(401).json({ ok: false, msg: "Cần đăng nhập" });

    const days = Number(req.query.days || 30);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const list = await ToeicWritingAttempt.find({
      userId,
      createdAt: { $gte: from },
      isSubmitted: true
    }).sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Lấy tên đề
    const setIds = [...new Set(list.map(a => a.setId))];
    const sets = await ToeicWritingSet.find({ _id: { $in: setIds } })
      .lean();
    const setMap = new Map(sets.map(s => [s._id.toString(), s.title]));

    const items = list.map(a => ({
      id: a._id,
      createdAt: a.createdAt,
      setId: a.setId,
      setTitle: setMap.get(a.setId.toString()) || "Đề không tên",

      predictedToeicScore: a.summary?.predictedToeicScore ?? null,
      overallScore: a.summary?.avgOverallScore ?? null,
      toeicWritingLevel: a.summary
        ? Math.ceil(a.summary.predictedToeicScore / 25)
        : null,

      summary: a.summary
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
    if (!at)
      return res.status(404).json({ ok: false, msg: "Không tìm thấy attempt" });

    const set = await ToeicWritingSet.findById(at.setId).lean();

    // Lấy danh sách câu hỏi thuộc các part mà user đã chọn
    const questions = await ToeicWritingQuestion.find({
      setId: at.setId,
      partKey: { $in: at.selectedParts }
    })
      .sort({ number: 1 })
      .lean();

    // Map answers theo questionId
    const answerMap = new Map(
      (at.answers || []).map(a => [a.questionId.toString(), a])
    );

    const items = questions.map(q => ({
      questionId: q._id,
      number: q.number,
      partKey: q.partKey,
      prompt: q.prompt,
      imageUrl: q.imageUrl,
      instructions: q.instructions,
      minWords: q.minWords,
      maxWords: q.maxWords,

      // answer
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
          createdAt: at.createdAt,
          submittedAt: at.submittedAt,
        },
        items
      }
    });

  } catch (err) {
    console.error("getWritingAttemptReview error:", err);
    return res.status(500).json({ ok: false, msg: "Không load được review" });
  }
};
