import ToeicSet from "../models/toeicSet.model.js";
import ToeicAttempt from "../models/toeicAttempt.model.js";
import ToeicQuestion from "../models/toeicQuestion.model.js";

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
      },
    });
  } catch (err) {
    console.error("getAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// ====== ADMIN: list tất cả bộ đề ======
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

// ví dụ trong admin.controller.js hoặc toeic.admin.controller.js
export const adminCreateSet = async (req, res) => {
  try {
    const { _id, title, durationSec, totalQuestions, isFree, status } = req.body;

    if (!_id)
      return res.status(400).json({ ok: false, msg: "Mã đề (_id) là bắt buộc" });

    const existed = await ToeicSet.findById(_id);
    if (existed)
      return res.status(400).json({ ok: false, msg: "Mã đề đã tồn tại" });

    const doc = await ToeicSet.create({
      _id,
      title,
      durationSec,
      totalQuestions,
      isFree,
      status,
      parts: [],
      stats: { attempts: 0, comments: 0 }
    });

    res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (err) {
    console.error("adminCreateSet error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};


// ====== ADMIN: update bộ đề ======
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

// ====== ADMIN: xóa bộ đề ======
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

// ====== ADMIN: list câu hỏi theo set + part ======
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
    }));

    res.json({ ok: true, data: shaped });
  } catch (err) {
    console.error("adminListQuestions error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// ====== ADMIN: tạo câu hỏi mới ======
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
    });

    res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (err) {
    console.error("adminCreateQuestion error:", err);
    // duplicate key (trùng setId + partKey + number)
    if (err.code === 11000) {
      return res.status(409).json({
        ok: false,
        msg: "Câu hỏi với số thứ tự này trong part đã tồn tại",
      });
    }
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// ====== ADMIN: update câu hỏi ======
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

// ====== ADMIN: xoá câu hỏi ======
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

    // Xoá hết câu cũ của set + part này, sau đó insert lại
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
    }));

    await ToeicQuestion.insertMany(docs);

    res.json({ ok: true, msg: "Import thành công", count: docs.length });
  } catch (err) {
    console.error("adminImportQuestions error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// ===== PUBLIC: lấy câu hỏi cho user luyện tập =====
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

    // Không trả explanation ra cho user (để dành cho phần review sau)
    const shaped = items.map((q) => ({
      id: q._id,
      number: q.number,
      partKey: q.partKey,
      questionText: q.questionText,
      choices: q.choices,
      imageUrl: q.imageUrl,
      audioUrl: q.audioUrl,
      passageId: q.passageId,
    }));

    res.json({ ok: true, data: shaped });
  } catch (err) {
    console.error("listQuestionsForUser error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};
