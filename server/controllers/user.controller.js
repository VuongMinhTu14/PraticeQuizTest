import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import User from "../models/user.model.js";

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

const __dirname = path.resolve();

/* ===================== AUTH ===================== */

// ===== REGISTER =====
export const register = async (req, res) => {
  try {
    let { username, displayName, email, password } = req.body;

    if (!username || !displayName || !email || !password) {
      return res.status(400).json({ ok: false, msg: "Thiếu thông tin đăng ký" });
    }

    email = email.trim().toLowerCase();

    const existed = await User.findOne({ email });
    if (existed) {
      return res.status(409).json({ ok: false, msg: "Email đã được sử dụng" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      displayName,
      email,
      hashedPassword,
      points: 50,
      role: req.body.role || "user",
    });

    const token = signToken({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      ok: true,
      msg: "Đăng ký thành công",
      user: {
        id: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        profileImage: newUser.profileImage,
        points: newUser.points,
        role: newUser.role,
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

    if (user.status === "disabled") {
      return res.status(403).json({ ok: false, msg: "Tài khoản đã bị khóa" });
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    res.json({
      ok: true,
      msg: "Đăng nhập thành công",
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profileImage: user.profileImage,
        points: user.points,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server", error: err.message });
  }
};

/* ===================== PROFILE ===================== */

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-hashedPassword");
    if (!user) {
      return res.status(404).json({ ok: false, msg: "User không tồn tại" });
    }

    res.json({
      ok: true,
      data: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profileImage: user.profileImage,
        points: user.points,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { displayName, username } = req.body;
    const updates = {};

    if (displayName && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (username && username.trim()) {
      updates.username = username.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ ok: false, msg: "Không có dữ liệu để cập nhật" });
    }

    if (updates.username) {
      const existed = await User.findOne({
        username: updates.username,
        _id: { $ne: req.user.id },
      });
      if (existed) {
        return res
          .status(409)
          .json({ ok: false, msg: "Username đã được sử dụng" });
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-hashedPassword");

    res.json({
      ok: true,
      msg: "Cập nhật hồ sơ thành công",
      data: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profileImage: user.profileImage,
        points: user.points,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

// Upload / đổi avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({ ok: false, msg: "Không có file avatar" });
    }

    const file = req.files.avatar;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        ok: false,
        msg: "Chỉ hỗ trợ file jpg, jpeg, png",
      });
    }

    const uploadDir = path.join(__dirname, "uploads", "avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name);
    const fileName = `avatar_${req.user.id}_${Date.now()}${ext}`;
    const savePath = path.join(uploadDir, fileName);

    await file.mv(savePath);

    const profileImage = `/uploads/avatars/${fileName}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage },
      { new: true }
    ).select("-hashedPassword");

    res.json({
      ok: true,
      msg: "Upload avatar thành công",
      data: {
        profileImage,
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          profileImage: user.profileImage,
          points: user.points,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};

// Đổi mật khẩu
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        msg: "Thiếu mật khẩu hiện tại hoặc mật khẩu mới",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ ok: false, msg: "User không tồn tại" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
    if (!isMatch) {
      return res
        .status(400)
        .json({ ok: false, msg: "Mật khẩu hiện tại không đúng" });
    }

    const newHashed = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = newHashed;
    await user.save();

    res.json({ ok: true, msg: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ ok: false, msg: "Lỗi server" });
  }
};
