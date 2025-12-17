// server/models/toeicAttempt.model.js
import mongoose, { Schema } from "mongoose";

const AnswerSchema = new Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "ToeicQuestion" },
    selectedOption: String,
    isCorrect: Boolean,
    partKey: String,
  },
  { _id: false }
);

const ScoreByPartSchema = new Schema(
  {
    partKey: String,   // p1, p2, ...
    correct: Number,
    total: Number,
    percent: Number,   // correct/total * 100
  },
  { _id: false }
);

const ToeicAttemptSchema = new Schema(
  {
    // Đề nào
    setId: {
      type: String,
      ref: "ToeicSet",
      required: true,
    },

    // Ai làm
    userId: {
      type: String,
      ref: "User",
      required: true,
    },

    // Kiểu làm: full test hay luyện 1 vài part
    mode: {
      type: String,
      enum: ["full", "parts"],
      default: "parts",
    },

    // Danh sách part được chọn lúc tạo attempt (["p1","p2",...])
    selectedParts: {
      type: [String],
      required: true,
    },

    timeLimitSec: {
      type: Number,
      default: null,
    },

    // Toàn bộ câu trả lời
    answers: [AnswerSchema],

    // Tổng kết theo từng part
    scoreByPart: [ScoreByPartSchema],

    // --- Field mới để dashboard đọc cho dễ ---
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },

    // Điểm tổng quát (0–100)
    scorePercent: {
      type: Number,
      default: null,
    },

    // Nếu sau này bạn muốn scale sang thang TOEIC Listening/Reading thì thêm field khác
    scoreRaw: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "submitted", "expired"],
      default: "active",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ToeicAttempt", ToeicAttemptSchema);
