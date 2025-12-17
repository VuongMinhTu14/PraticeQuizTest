import jwt from "jsonwebtoken";

// Xác thực JWT từ header Authorization: Bearer <token>
export const verifyToken = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, msg: "Cần đăng nhập" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, msg: "Invalid or expired token" });
  }
};

// Yêu cầu quyền admin cho các route quản trị
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ ok: false, msg: "Cần quyền admin" });
  }
  next();
};
