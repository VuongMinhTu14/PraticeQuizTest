// controllers/toeicWriting.controller.js
import ToeicWritingSet from "../models/toeicWritingSet.model.js";
import ToeicWritingAttempt from "../models/toeicWritingAttempt.model.js";
import { gradeWriting } from "../utils/writingGrader.js";

const getWritingLevelFromScore = (score) => {
  if (score == null) return null;
  if (score <= 30) return 1;
  if (score <= 50) return 2;
  if (score <= 70) return 3;
  if (score <= 100) return 4;
  if (score <= 130) return 5;
  if (score <= 160) return 6;
  if (score === 170) return 7;
  return 8; // 180–200
};

/*GET /toeic-writing/sets*/
export const listWritingSets = async (req, res) => {
  try {
    const items = await ToeicWritingSet.find({ status: "published" })
      .sort({ year: -1, createdAt: -1 })
      .select("_id title taskType year tags maxScore minWords maxWords");

    const shaped = items.map((x) => ({
      id: x._id,
      title: x.title,
      taskType: x.taskType,
      year: x.year,
      tags: x.tags,
      maxScore: x.maxScore,
      minWords: x.minWords,
      maxWords: x.maxWords,
    }));

    res.json({ ok: true, items: shaped });
  } catch (err) {
    console.error("listWritingSets error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

/*GET /toeic-writing/sets/:id*/
export const getWritingSet = async (req, res) => {
  try {
    const doc = await ToeicWritingSet.findById(req.params.id);
    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, msg: "Không tìm thấy đề writing" });
    }

    res.json({
      ok: true,
      data: {
        id: doc._id,
        title: doc.title,
        taskType: doc.taskType,
        prompt: doc.prompt,
        instructions: doc.instructions,
        minWords: doc.minWords,
        maxWords: doc.maxWords,
        year: doc.year,
        source: doc.source,
        maxScore: doc.maxScore,
        rubric: doc.rubric,
        tags: doc.tags,
        status: doc.status,
      },
    });
  } catch (err) {
    console.error("getWritingSet error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

/*GET /toeic-writing/admin/sets*/
export const adminListWritingSets = async (req, res) => {
  try {
    const items = await ToeicWritingSet.find({}).sort({ createdAt: -1 });
    res.json({ ok: true, items });
  } catch (err) {
    console.error("adminListWritingSets error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

/*POST /toeic-writing/admin/sets*/
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
    } = req.body || {};

    if (!_id || !title || !prompt) {
      return res.status(400).json({
        ok: false,
        msg: "Thiếu thông tin bắt buộc: _id, title, prompt",
      });
    }

    const existed = await ToeicWritingSet.findById(_id);
    if (existed) {
      return res.status(400).json({ ok: false, msg: "Mã đề đã tồn tại" });
    }

    const doc = await ToeicWritingSet.create({
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
      createdBy: req.user?.id || null,
    });

    res.status(201).json({
      ok: true,
      data: { id: doc._id },
      msg: "Tạo đề writing thành công",
    });
  } catch (err) {
    console.error("adminCreateWritingSet error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

/*PUT /toeic-writing/admin/sets/:id*/
export const adminUpdateWritingSet = async (req, res) => {
  try {
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
    } = req.body || {};

    const updated = await ToeicWritingSet.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(title !== undefined && { title }),
          ...(taskType !== undefined && { taskType }),
          ...(prompt !== undefined && { prompt }),
          ...(instructions !== undefined && { instructions }),
          ...(minWords !== undefined && { minWords }),
          ...(maxWords !== undefined && { maxWords }),
          ...(year !== undefined && { year }),
          ...(source !== undefined && { source }),
          ...(maxScore !== undefined && { maxScore }),
          ...(rubric !== undefined && { rubric }),
          ...(tags !== undefined && { tags }),
          ...(status !== undefined && { status }),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ ok: false, msg: "Không tìm thấy đề writing" });
    }

    res.json({
      ok: true,
      msg: "Cập nhật đề writing thành công",
      data: updated,
    });
  } catch (err) {
    console.error("adminUpdateWritingSet error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

/*DELETE /toeic-writing/admin/sets/:id*/
export const adminDeleteWritingSet = async (req, res) => {
  try {
    const deleted = await ToeicWritingSet.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ ok: false, msg: "Không tìm thấy đề writing" });
    }

    res.json({ ok: true, msg: "Xoá đề writing thành công" });
  } catch (err) {
    console.error("adminDeleteWritingSet error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

// ====== USER: TẠO ATTEMPT + GỌI AI CHẤM ĐIỂM ======
export const createWritingAttempt = async (req, res) => {
  try {
    const setId = req.params.id;
    const userId = req.userId || null;

    const set = await ToeicWritingSet.findById(setId);
    if (!set) {
      return res
        .status(404)
        .json({ ok: false, msg: "Không tìm thấy đề writing" });
    }

    const answerText = req.body.answerText || "";

    const grade = await gradeWriting({
      prompt: set.prompt,
      answerText,
      rubric: set.rubric,
      level: "TOEIC",
    });

    // nếu vì lý do gì đó grade vẫn null/undefined
    const g = grade || {
      taskScore: 0,
      grammarScore: 0,
      vocabularyScore: 0,
      organizationScore: 0,
      overallScore: 0,
      predictedToeicScore: 0,
      toeicWritingLevel: 1,
      feedback:
        "Hệ thống AI hiện chưa chấm được bài này. Điểm tạm thời là 0, vui lòng thử lại sau.",
    };

    const attempt = await ToeicWritingAttempt.create({
      userId,
      setId,
      answerText,
      scores: {
        task: g.taskScore,
        grammar: g.grammarScore,
        vocabulary: g.vocabularyScore,
        organization: g.organizationScore,
        overallScore: g.overallScore,
        predictedToeicScore: g.predictedToeicScore,
        toeicWritingLevel: g.toeicWritingLevel,
      },
      feedback: g.feedback,
      level: "TOEIC",
    });

    return res.status(201).json({ ok: true, data: attempt });
  } catch (err) {
    console.error("createWritingAttempt error:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Lỗi hệ thống khi lưu attempt" });
  }
};

// GET /toeic-writing/attempts/:id
export const getWritingAttempt = async (req, res) => {
  try {
    const doc = await ToeicWritingAttempt.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy attempt" });
    }
    res.json({ ok: true, data: doc });
  } catch (err) {
    console.error("getWritingAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

// GET /toeic-writing/sets/:id/last-attempt
export const getWritingLastAttempt = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ ok: false, msg: "Bạn cần đăng nhập để xem attempt" });
    }

    const doc = await ToeicWritingAttempt.findOne({
      userId,
      setId: req.params.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ok: true, data: doc || null });
  } catch (err) {
    console.error("getWritingLastAttempt error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

// GET /toeic-writing/my/recent-attempts?days=30
export const getMyWritingRecentAttempts = async (req, res) => {
  try {
    const userId = req.userId;
    const days = parseInt(req.query.days || "30", 10);

    const from = new Date();
    from.setDate(from.getDate() - days);

    const attempts = await ToeicWritingAttempt.find({
      userId,
      createdAt: { $gte: from },
    })
      .sort({ createdAt: 1 })
      .populate("setId", "title");

    const items = attempts.map((a) => {
      const s = a.scores || {};
      const predicted = s.predictedToeicScore;
      return {
        id: a._id.toString(),
        setTitle: a.setId?.title || "(Đề đã xoá)",
        predictedToeicScore: predicted,
        overallScore: s.overallScore,
        toeicWritingLevel: getWritingLevelFromScore(predicted),
        createdAt: a.createdAt,
      };
    });

    return res.json({ ok: true, items });
  } catch (err) {
    console.error("getMyWritingRecentAttempts error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi lấy lịch sử TOEIC Writing" });
  }
};

