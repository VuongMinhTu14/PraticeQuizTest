import ToeicSet from "../models/toeicSet.model.js";
import ToeicAttempt from "../models/toeicAttempt.model.js";

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
      userId: req.user.id, // ✅ lấy từ verifyToken middleware
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
