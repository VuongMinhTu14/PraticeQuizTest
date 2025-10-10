import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Tạo JWT token
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

// ===== REGISTER =====
export const register = async (req, res) => {
  try {
    let { username, displayName, email, password } = req.body;

    if (!username || !displayName || !email || !password) {
      return res.status(400).json({ ok: false, msg: "Thiếu thông tin đăng ký" });
    }

    email = email.trim().toLowerCase();

    // Kiểm tra trùng email
    const existed = await User.findOne({ email });
    if (existed) {
      return res
        .status(409)
        .json({ ok: false, msg: "Email đã được sử dụng!" });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      displayName,
      email,
      hashedPassword,
      points: 50
    });

    const token = signToken({ id: newUser._id, email: newUser.email });

    res.status(201).json({
      ok: true,
      msg: "Đăng ký thành công!",
      user: {
        id: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        points: newUser.points,
      },
      token,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server", error: err.message });
  }
};

// ===== LOGIN =====
export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, msg: "Thiếu email hoặc mật khẩu" });
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ ok: false, msg: "Email không tồn tại" });
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ ok: false, msg: "Mật khẩu không đúng" });
    }

    const token = signToken({ id: user._id, email: user.email });

    res.json({
      ok: true,
      msg: "Đăng nhập thành công",
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profileImage: user.profileImage,
        points: user.points
      },
      token,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server", error: err.message });
  }
};
