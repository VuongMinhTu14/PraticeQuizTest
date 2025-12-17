import { buildUserPrediction } from "../utils/predictionService.js";

// GET /prediction/my/latest
export const getMyLatestPrediction = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, msg: "Cần đăng nhập" });
    }

    const data = await buildUserPrediction(userId);

    return res.json({
      ok: true,
      data,
    });
  } catch (err) {
    console.error("getMyLatestPrediction error:", err);
    return res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

export default getMyLatestPrediction;
