import User from "../models/user.model.js";
import ToeicAttempt from "../models/toeicAttempt.model.js";
import ToeicWritingAttempt from "../models/toeicWritingAttempt.model.js";

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export const getAdminOverview = async (req, res) => {
  try {
    const days = Math.max(1, Number(req.query.days) || 30);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [
      totalUsers,
      newUsers,
      totalToeicAttempts,
      totalWritingAttempts,
      toeicAttemptsRecent,
      writingAttemptsRecent,
      toeicAttemptsByDate,
      writingAttemptsByDate,
      newUsersByDate,
      avgToeicRecent,
      avgWritingRecent,
      fallbackCountRecent,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: from } }),
      ToeicAttempt.countDocuments({}),
      ToeicWritingAttempt.countDocuments({}),
      ToeicAttempt.countDocuments({ status: "submitted", createdAt: { $gte: from } }),
      ToeicWritingAttempt.countDocuments({ isSubmitted: true, createdAt: { $gte: from } }),
      ToeicAttempt.aggregate([
        { $match: { status: "submitted", createdAt: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ToeicWritingAttempt.aggregate([
        { $match: { isSubmitted: true, createdAt: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ToeicAttempt.aggregate([
        { $match: { status: "submitted", createdAt: { $gte: from }, scorePercent: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: "$scorePercent" } } },
      ]),
      ToeicWritingAttempt.aggregate([
        {
          $match: {
            isSubmitted: true,
            createdAt: { $gte: from },
            "summary.avgOverallScore": { $ne: null },
          },
        },
        { $group: { _id: null, avg: { $avg: "$summary.avgOverallScore" } } },
      ]),
      ToeicWritingAttempt.aggregate([
        { $match: { createdAt: { $gte: from }, isSubmitted: true } },
        { $unwind: "$answers" },
        { $match: { "answers.ai.fallback": true } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
    ]);

    const avgToeicPercent = avgToeicRecent?.[0]?.avg
      ? Number(avgToeicRecent[0].avg.toFixed(2))
      : null;
    const avgWritingScore = avgWritingRecent?.[0]?.avg
      ? Number(avgWritingRecent[0].avg.toFixed(2))
      : null;

    const fallbackAi = fallbackCountRecent?.[0]?.count || 0;

    res.json({
      ok: true,
      data: {
        totals: {
          users: totalUsers,
          toeicAttempts: totalToeicAttempts,
          writingAttempts: totalWritingAttempts,
        },
        recent: {
          newUsers: newUsers,
          toeicAttempts: toeicAttemptsRecent,
          writingAttempts: writingAttemptsRecent,
        },
        averages: {
          toeicPercent: avgToeicPercent,
          writingOverall: avgWritingScore,
        },
        fallbackAi,
        charts: {
          toeicAttemptsByDate: toeicAttemptsByDate.map((d) => ({ date: d._id, count: d.count })),
          writingAttemptsByDate: writingAttemptsByDate.map((d) => ({ date: d._id, count: d.count })),
          newUsersByDate: newUsersByDate.map((d) => ({ date: d._id, count: d.count })),
        },
        range: {
          from: toDateOnly(from),
          to: toDateOnly(new Date()),
        },
      },
    });
  } catch (err) {
    console.error("getAdminOverview error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

export default getAdminOverview;
