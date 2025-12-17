import mongoose, { Schema } from "mongoose";

const AdminAuditSchema = new Schema(
  {
    adminId: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("AdminAudit", AdminAuditSchema);
