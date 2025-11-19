// controllers/admin.controller.js
import User from "../models/user.model.js";

// GET /admin/users
export const listUsers = async (req, res) => {
  try {
    const items = await User.find({})
      .sort({ createdAt: -1 })
      .select("_id username displayName email points createdAt role");

    const shaped = items.map((u) => ({
      id: u._id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      points: u.points ?? 0,
      role: u.role || "user",
      createdAt: u.createdAt,
    }));

    res.json({ ok: true, data: shaped });
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// PATCH /admin/users/:id  (reset điểm / chỉnh vài field)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ["displayName", "username", "points", "role"];
    const payload = {};

    for (const key of allowed) {
      if (key in req.body) payload[key] = req.body[key];
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy user" });
    }

    res.json({ ok: true, data: { id: updated._id } });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// DELETE /admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy user" });
    }
    res.json({ ok: true, msg: "Đã xóa user" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};
