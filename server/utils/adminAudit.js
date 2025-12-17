import AdminAudit from "../models/adminAudit.model.js";

export async function logAdminAction({ adminId, action, targetType, targetId, meta = {} }) {
  if (!adminId || !action) return;
  try {
    await AdminAudit.create({
      adminId,
      action,
      targetType,
      targetId,
      meta,
    });
  } catch (err) {
    console.error("adminAudit error:", err?.message || err);
  }
}

export default logAdminAction;
