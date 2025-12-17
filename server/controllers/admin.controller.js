// controllers/admin.controller.js
import User from "../models/user.model.js";
import { logAdminAction } from "../utils/adminAudit.js";

// GET /admin/users
export const listUsers = async (req, res) => {
  try {
    const {
      search = "",
      role,
      status,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortDir = "desc",
    } = req.query || {};

    const filter = {};
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ email: regex }, { username: regex }, { displayName: regex }];
    }
    if (role) filter.role = role;
    if (status) filter.status = status;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(5, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortDir === "asc" ? 1 : -1 };

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select("_id username displayName email points createdAt role status"),
      User.countDocuments(filter),
    ]);

    const shaped = items.map((u) => ({
      id: u._id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      points: u.points ?? 0,
      role: u.role || "user",
      status: u.status || "active",
      createdAt: u.createdAt,
    }));

    res.json({
      ok: true,
      data: shaped,
      total,
      page: pageNum,
      pageSize: limitNum,
    });
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// PATCH /admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ["displayName", "username", "points", "role", "status"];
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

    logAdminAction({
      adminId: req.user?.id || "unknown",
      action: "update_user",
      targetType: "user",
      targetId: id,
      meta: payload,
    });

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

    logAdminAction({
      adminId: req.user?.id || "unknown",
      action: "delete_user",
      targetType: "user",
      targetId: id,
      meta: {},
    });

    res.json({ ok: true, msg: "Đã xóa user" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};

// POST /admin/users/:id/reset-points
export const resetUserPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { points: 0 } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ ok: false, msg: "Không tìm thấy user" });
    }

    logAdminAction({
      adminId: req.user?.id || "unknown",
      action: "reset_points",
      targetType: "user",
      targetId: id,
      meta: {},
    });

    res.json({ ok: true, data: { id: user._id, points: user.points } });
  } catch (err) {
    console.error("resetUserPoints error:", err);
    res.status(500).json({ ok: false, msg: "Server error" });
  }
};
