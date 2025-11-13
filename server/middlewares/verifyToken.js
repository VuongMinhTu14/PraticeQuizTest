import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // Lấy token từ header
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, msg: "Bạn cần đăng nhập để luyện đề hoặc chơi game" });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Gắn thông tin user vào request để các route khác dùng
    req.user = { id: decoded.id };

    next();
  } catch (err) {
    return res.status(401).json({ ok: false, msg: "Invalid or expired token" });
  }
};
