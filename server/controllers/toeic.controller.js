import ToeicSet from "../models/toeicSet.model.js";
import ToeicAttempt from "../models/toeicAttempt.model.js";
import ToeicQuestion from "../models/toeicQuestion.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper đảm bảo thư mục tồn tại
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const DEFAULT_PARTS = [
  { key: "p1", name: "Part 1 - Photos",              questions: 6,  tags: [], order: 1 },
  { key: "p2", name: "Part 2 - Question-Response",    questions: 25, tags: [], order: 2 },
  { key: "p3", name: "Part 3 - Conversations",        questions: 39, tags: [], order: 3 },
  { key: "p4", name: "Part 4 - Talks",                questions: 30, tags: [], order: 4 },
  { key: "p5", name: "Part 5 - Incomplete Sentences", questions: 30, tags: [], order: 5 },
  { key: "p6", name: "Part 6 - Text Completion",      questions: 16, tags: [], order: 6 },
  { key: "p7", name: "Part 7 - Reading",              questions: 54, tags: [], order: 7 }
];

// =====================================
// PUBLIC: LIST & DETAIL SET
// =====================================

// GET /toeic/sets
export const listSets = async (req, res) => {
  try {
    const items = await ToeicSet.find({ status: "published" })
      .select("_id title durationSec totalQuestions parts stats isFree")
      .sort({ createdAt: -1 });

    const shaped = items.map((x) => ({
      id: x._id,
      title: x.title,
      durationSec: x.durationSec,
      partsCount: x.parts.length,
      totalQuestions: x.totalQuestions,
      isFree: x.isFree,
      tags: ["TOEIC"],
      stats: x.stats,
    }));

    res.json({ ok: true, items: shaped });
  } catch (err) {
    console.error("listSets error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// GET /toeic/sets/:id
export const getSet = async (req, res) => {
  try {
    const set = await ToeicSet.findById(req.params.id);
    if (!set) return res.status(404).json({ ok: false, msg: "Not found" });

    res.json({
      ok: true,
      data: {
        id: set._id,
        title: set.title,
        durationSec: set.durationSec,
        totalQuestions: set.totalQuestions,
        parts: set.parts,
        stats: set.stats,
        isFree: set.isFree,
      },
    });
  } catch (err) {
    console.error("getSet error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// =====================================
// ATTEMPT
// =====================================

// POST /toeic/sets/:id/attempts  (yêu cầu đăng nhập)
export const createAttempt = async (req, res) => {
  try {
    const { selectedParts, timeLimitSec } = req.body || {};

    if (!Array.isArray(selectedParts) || selectedParts.length === 0)
      return res.status(400).json({ ok: false, msg: "Chọn ít nhất 1 part" });

    const set = await ToeicSet.findById(req.params.id);
    if (!set) return res.status(404).json({ ok: false, msg: "Không tìm thấy bộ đề" });

    const valid = new Set(set.parts.map((p) => p.key));
    if (!selectedParts.every((k) => valid.has(k)))
      return res.status(400).json({ ok: false, msg: "Part không hợp lệ" });

    const att = await ToeicAttempt.create({
      setId: set._id,
      userId: req.user.id,
      selectedParts,
      timeLimitSec: timeLimitSec ?? null,
    });

    await ToeicSet.updateOne({ _id: set._id }, { $inc: { "stats.attempts": 1 } });

    res.status(201).json({ ok: true, attemptId: att._id.toString() });
  } catch (err) {
    console.error("createAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// GET /toeic/attempts/:id
export const getAttempt = async (req, res) => {
  try {
    const { id } = req.params;

    const att = await ToeicAttempt.findById(id).lean();
    if (!att) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy attempt" });
    }

    const set = await ToeicSet.findById(att.setId)
      .select("_id title durationSec totalQuestions parts")
      .lean();

    if (!set) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy đề thi" });
    }

    res.json({
      ok: true,
      data: {
        id: att._id.toString(),
        setId: att.setId,
        setTitle: set.title,
        durationSec: set.durationSec,
        totalQuestions: set.totalQuestions,
        selectedParts: att.selectedParts,
        timeLimitSec: att.timeLimitSec,
        startedAt: att.createdAt,

        status: att.status,
        scoreRaw: att.scoreRaw,
        scorePercent: att.scorePercent,
        scoreByPart: att.scoreByPart,
      },
    });
  } catch (err) {
    console.error("getAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export const getToeicLastAttempt = async (req, res) => {
  try {
    const { id } = req.params;        // setId
    const userId = req.user.id;

    const last = await ToeicAttempt.findOne({
      setId: id,
      userId,
      status: "submitted",
    })
      .sort({ submittedAt: -1 })
      .lean();

    if (!last) {
      return res.json({ ok: true, data: null });    
    }

    res.json({
      ok: true,
      data: {
        setId: last.setId,
        scoreRaw: last.scoreRaw,
        scorePercent: last.scorePercent,
        scoreByPart: last.scoreByPart,
        totalQuestions: last.answers.length,
      },
    });
  } catch (err) {
    console.error("getToeicLastAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// POST /toeic/attempts/:id/submit
export const submitAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body || []; // answers = [{ questionId, selectedOption }]

    const att = await ToeicAttempt.findById(id);
    if (!att) {
      return res
        .status(404)
        .json({ ok: false, msg: "Không tìm thấy attempt" });
    }

    if (req.user && att.userId !== req.user.id) {
      return res
        .status(403)
        .json({ ok: false, msg: "Không có quyền nộp bài này" });
    }

    const questions = await ToeicQuestion.find({
      setId: att.setId,
      partKey: { $in: att.selectedParts },
    }).lean();

    const qMap = new Map();
    questions.forEach((q) => {
      qMap.set(String(q._id), q);
    });

    const partStats = {}; // { p1: { correct, total }, ... }
    let correctCount = 0;

    const normalizedAnswers = (answers || [])
      .map((a) => {
        const q = qMap.get(String(a.questionId));
        if (!q) return null;

        const isCorrect = a.selectedOption === q.correctOption;

        if (!partStats[q.partKey]) {
          partStats[q.partKey] = { correct: 0, total: 0 };
        }
        partStats[q.partKey].total += 1;
        if (isCorrect) {
          partStats[q.partKey].correct += 1;
          correctCount += 1;
        }

        return {
          questionId: q._id,
          selectedOption: a.selectedOption,
          isCorrect,
          partKey: q.partKey,
        };
      })
      .filter(Boolean);

    const totalQuestions = questions.length;
    const totalCorrect = correctCount;
    const scoreRaw = totalCorrect;
    const scorePercent =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    const scoreByPart = Object.entries(partStats).map(([partKey, s]) => ({
      partKey,
      correct: s.correct,
      total: s.total,
      percent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    const selectedParts = att.selectedParts || [];
    const isFullTest =
      selectedParts.length >= 7 ||
      Object.keys(partStats).length >= 7;

    att.answers = normalizedAnswers;
    att.scoreByPart = scoreByPart;
    att.status = "submitted";
    att.submittedAt = new Date();
    att.scoreRaw = scoreRaw;
    att.scorePercent = scorePercent;

    att.totalQuestions = totalQuestions;
    att.totalCorrect = totalCorrect;
    att.mode = isFullTest ? "full" : "parts";

    await att.save();

    res.json({
      ok: true,
      data: {
        attemptId: att._id.toString(),
        setId: att.setId,
        mode: att.mode,
        selectedParts: att.selectedParts,
        totalQuestions,
        totalCorrect,
        scoreRaw,
        scorePercent,
        scoreByPart,
      },
    });
  } catch (err) {
    console.error("submitAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// =====================================
// ADMIN: SETS
// =====================================

export const adminListSets = async (req, res) => {
  try {
    const items = await ToeicSet.find({}).sort({ createdAt: -1 });

    const shaped = items.map((x) => ({
      id: x._id,
      title: x.title,
      durationSec: x.durationSec,
      totalQuestions: x.totalQuestions,
      parts: x.parts || [],
      partsCount: x.parts?.length || 0,
      isFree: x.isFree,
      status: x.status,
      stats: x.stats,
      createdAt: x.createdAt,
    }));

    res.json({ ok: true, data: shaped });
  } catch (err) {
    console.error("adminListSets error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export const adminCreateSet = async (req, res) => {
  try {
    const { _id, title, durationSec, totalQuestions, isFree, status, parts } =
      req.body;

    if (!_id) {
      return res.status(400).json({ ok: false, msg: "Mã đề (_id) là bắt buộc" });
    }

    const existed = await ToeicSet.findById(_id);
    if (existed) {
      return res.status(400).json({ ok: false, msg: "Mã đề đã tồn tại" });
    }

    const doc = await ToeicSet.create({
      _id,
      title,
      durationSec,
      totalQuestions,
      isFree,
      status,
      parts: Array.isArray(parts) && parts.length > 0 ? parts : DEFAULT_PARTS,
      stats: { attempts: 0, comments: 0 },
    });

    res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (err) {
    console.error("adminCreateSet error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

export const adminUpdateSet = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      durationSec,
      totalQuestions,
      isFree,
      status,
      parts,
    } = req.body || {};

    const payload = {};
    if (title != null) payload.title = title;
    if (durationSec != null) payload.durationSec = durationSec;
    if (totalQuestions != null) payload.totalQuestions = totalQuestions;
    if (isFree != null) payload.isFree = isFree;
    if (status != null) payload.status = status;
    if (Array.isArray(parts)) payload.parts = parts;

    const updated = await ToeicSet.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy bộ đề" });
    }

    res.json({ ok: true, data: { id: updated._id } });
  } catch (err) {
    console.error("adminUpdateSet error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export const adminDeleteSet = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ToeicSet.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy bộ đề" });
    }
    res.json({ ok: true, msg: "Đã xóa bộ đề" });
  } catch (err) {
    console.error("adminDeleteSet error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// =====================================
// ADMIN: QUESTIONS
// =====================================

// list câu hỏi theo set + part
export const adminListQuestions = async (req, res) => {
  try {
    const { setId } = req.params;
    const { part } = req.query; // partKey: "p1"..."p7"

    if (!setId) {
      return res.status(400).json({ ok: false, msg: "Thiếu setId" });
    }

    const filter = { setId };
    if (part) filter.partKey = part;

    const items = await ToeicQuestion.find(filter)
      .sort({ number: 1 })
      .lean();

    const shaped = items.map((q) => ({
      id: q._id,
      setId: q.setId,
      partKey: q.partKey,
      number: q.number,
      questionText: q.questionText,
      choices: q.choices,
      correctOption: q.correctOption,
      explanation: q.explanation,
      imageUrl: q.imageUrl,
      audioUrl: q.audioUrl,
      passageId: q.passageId,
      passageOrder: q.passageOrder,
      passageText: q.passageText,
    }));

    res.json({ ok: true, data: shaped });
  } catch (err) {
    console.error("adminListQuestions error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export const adminCreateQuestion = async (req, res) => {
  try {
    const { setId } = req.params;
    const {
      partKey,
      number,
      questionText,
      choices,
      correctOption,
      explanation,
      imageUrl,
      audioUrl,
      passageId,
      passageOrder,
      passageText,
    } = req.body || {};

    if (!setId || !partKey || !number || !questionText || !correctOption) {
      return res.status(400).json({
        ok: false,
        msg: "Thiếu setId / partKey / number / questionText / correctOption",
      });
    }

    const doc = await ToeicQuestion.create({
      setId,
      partKey,
      number,
      questionText,
      choices: Array.isArray(choices) ? choices : [],
      correctOption,
      explanation,
      imageUrl,
      audioUrl,
      passageId,
      passageOrder,
      passageText,
    });

    res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (err) {
    console.error("adminCreateQuestion error:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        ok: false,
        msg: "Câu hỏi với số thứ tự này trong part đã tồn tại",
      });
    }
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export const adminUpdateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      partKey,
      number,
      questionText,
      choices,
      correctOption,
      explanation,
      imageUrl,
      audioUrl,
      passageId,
      passageOrder,
      passageText,
    } = req.body || {};

    const payload = {};
    if (partKey != null) payload.partKey = partKey;
    if (number != null) payload.number = number;
    if (questionText != null) payload.questionText = questionText;
    if (Array.isArray(choices)) payload.choices = choices;
    if (correctOption != null) payload.correctOption = correctOption;
    if (explanation != null) payload.explanation = explanation;
    if (imageUrl != null) payload.imageUrl = imageUrl;
    if (audioUrl != null) payload.audioUrl = audioUrl;
    if (passageId != null) payload.passageId = passageId;
    if (passageOrder != null) payload.passageOrder = passageOrder;
    if (passageText != null) payload.passageText = passageText;

    const updated = await ToeicQuestion.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy câu hỏi" });
    }

    res.json({ ok: true, data: { id: updated._id } });
  } catch (err) {
    console.error("adminUpdateQuestion error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export const adminDeleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ToeicQuestion.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy câu hỏi" });
    }
    res.json({ ok: true, msg: "Đã xóa câu hỏi" });
  } catch (err) {
    console.error("adminDeleteQuestion error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export const adminImportQuestions = async (req, res) => {
  try {
    const { setId } = req.params;
    const { partKey, questions } = req.body || {};

    if (!setId || !partKey || !Array.isArray(questions)) {
      return res.status(400).json({
        ok: false,
        msg: "Thiếu setId / partKey / questions",
      });
    }

    await ToeicQuestion.deleteMany({ setId, partKey });

    const docs = questions.map((q) => ({
      setId,
      partKey,
      number: q.number,
      questionText: q.questionText,
      choices: Array.isArray(q.choices) ? q.choices : [],
      correctOption: q.correctOption,
      explanation: q.explanation,
      imageUrl: q.imageUrl,
      audioUrl: q.audioUrl,
      passageId: q.passageId,
      passageOrder: q.passageOrder,
      passageText: q.passageText,
    }));

    await ToeicQuestion.insertMany(docs);

    res.json({ ok: true, msg: "Import thành công", count: docs.length });
  } catch (err) {
    console.error("adminImportQuestions error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// =====================================
// PUBLIC: QUESTIONS FOR USER
// =====================================

export const listQuestionsForUser = async (req, res) => {
  try {
    const { id } = req.params;   // setId
    const { part } = req.query;  // partKey: p1..p7 (optional)

    if (!id) {
      return res.status(400).json({ ok: false, msg: "Thiếu id bộ đề" });
    }

    const filter = { setId: id };
    if (part) filter.partKey = part;

    const items = await ToeicQuestion.find(filter).sort({ number: 1 }).lean();

    const shaped = items.map((q) => ({
      id: q._id,
      number: q.number,
      partKey: q.partKey,
      questionText: q.questionText,
      choices: q.choices,
      imageUrl: q.imageUrl,
      audioUrl: q.audioUrl,
      passageId: q.passageId,
      passageOrder: q.passageOrder,
      passageText: q.passageText,
    }));

    res.json({ ok: true, data: shaped });
  } catch (err) {
    console.error("listQuestionsForUser error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// =====================================
// PUBLIC: RECENT ATTEMPTS
// =====================================

export const getMyToeicRecentAttempts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, msg: "Chưa đăng nhập" });
    }

    const days = parseInt(req.query.days || "30", 10);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const attempts = await ToeicAttempt.find({
      userId,
      createdAt: { $gte: from },
      status: "submitted",
    })
      .sort({ createdAt: 1 })
      .populate("setId", "title");

    const items = attempts.map((a) => ({
      id: a._id.toString(),
      setId: a.setId._id || a.setId,
      setTitle: a.setId.title,
      mode: a.mode,
      totalScore: a.scorePercent ?? null,
      totalCorrect: a.totalCorrect ?? null,
      totalQuestions: a.totalQuestions ?? null,
      scoreByPart: a.scoreByPart || [],
      createdAt: a.createdAt,
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("getMyToeicRecentAttempts error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi lấy lịch sử TOEIC" });
  }
};

// =====================================
// ADMIN UPLOAD IMAGE/AUDIO
// =====================================

export const adminUploadQuestionImage = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("===> Upload IMAGE for question:", id);
    console.log("files:", req.files);

    if (!req.files || !req.files.file) {
      return res.status(400).json({ ok: false, msg: "Không có file upload" });
    }

    const file = req.files.file;

    console.log("IMAGE name:", file.name, "type:", file.mimetype);

    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({
        ok: false,
        msg: "Chỉ chấp nhận file ảnh JPG/PNG",
      });
    }

    const q = await ToeicQuestion.findById(id);
    if (!q) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy câu hỏi" });
    }

    const uploadDir = path.join(__dirname, "..", "uploads", "toeic", "images");
    ensureDir(uploadDir);

    const ext = file.name.split(".").pop();
    const safeName = `q_${q._id}_${Date.now()}.${ext}`;
    const destPath = path.join(uploadDir, safeName);

    await file.mv(destPath);

    const fileUrl = `/uploads/toeic/images/${safeName}`;
    q.imageUrl = fileUrl;
    await q.save();

    console.log("IMAGE saved to:", destPath);
    return res.json({ ok: true, data: { imageUrl: fileUrl } });
  } catch (err) {
    console.error("adminUploadQuestionImage error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi upload ảnh câu hỏi" });
  }
};

export const adminUploadQuestionAudio = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("===> Upload AUDIO for question:", id);
    console.log("files:", req.files);

    if (!req.files || !req.files.file) {
      return res.status(400).json({ ok: false, msg: "Không có file upload" });
    }

    const file = req.files.file;
    console.log("AUDIO name:", file.name, "type:", file.mimetype);

    const allowed = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/m4a",
    ];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({
        ok: false,
        msg: "Chỉ chấp nhận file audio (mp3/wav/m4a)",
      });
    }

    const q = await ToeicQuestion.findById(id);
    if (!q) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy câu hỏi" });
    }

    const uploadDir = path.join(__dirname, "..", "uploads", "toeic", "audio");
    ensureDir(uploadDir);

    const ext = file.name.split(".").pop();
    const safeName = `q_${q._id}_${Date.now()}.${ext}`;
    const destPath = path.join(uploadDir, safeName);

    await file.mv(destPath);

    const fileUrl = `/uploads/toeic/audio/${safeName}`;
    q.audioUrl = fileUrl;
    await q.save();

    console.log("AUDIO saved to:", destPath);
    return res.json({ ok: true, data: { audioUrl: fileUrl } });
  } catch (err) {
    console.error("adminUploadQuestionAudio error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi upload audio câu hỏi" });
  }
};

// GET /toeic/attempts/:id/review
export const getAttemptReview = async (req, res) => {
  try {
    const { id } = req.params;

    const att = await ToeicAttempt.findById(id).lean();
    if (!att) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy attempt" });
    }

    // Optionally check quyền:
    if (req.user && String(att.userId) !== String(req.user.id)) {
      return res.status(403).json({ ok: false, msg: "Không có quyền xem bài này" });
    }

    const questions = await ToeicQuestion.find({
      setId: att.setId,
      partKey: { $in: att.selectedParts || [] },
    })
      .sort({ number: 1 })
      .lean();

    // map answer theo questionId
    const ansMap = new Map();
    (att.answers || []).forEach((a) => {
      ansMap.set(String(a.questionId), a);
    });

    const items = questions.map((q) => {
      const ans = ansMap.get(String(q._id));
      return {
        questionId: q._id,
        number: q.number,
        partKey: q.partKey,
        questionText: q.questionText,
        choices: q.choices,
        correctOption: q.correctOption,
        explanation: q.explanation || "",
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        passageId: q.passageId,
        passageText: q.passageText,

        userAnswer: ans ? ans.selectedOption : null,
        isCorrect: ans ? !!ans.isCorrect : false,
      };
    });

    return res.json({
      ok: true,
      data: {
        attempt: {
          id: att._id,
          setId: att.setId,
          selectedParts: att.selectedParts,
          mode: att.mode,
          totalQuestions: att.totalQuestions,
          totalCorrect: att.totalCorrect,
          scoreRaw: att.scoreRaw,
          scorePercent: att.scorePercent,
          scoreByPart: att.scoreByPart || [],
          createdAt: att.createdAt,
          submittedAt: att.submittedAt,
        },
        items,
      },
    });
  } catch (err) {
    console.error("getAttemptReview error:", err);
    return res.status(500).json({ ok: false, msg: "Server error" });
  }
};

