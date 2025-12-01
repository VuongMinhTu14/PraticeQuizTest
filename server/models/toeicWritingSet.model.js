// models/toeicWritingSet.model.js
import { Schema, model } from "mongoose";

const ToeicWritingSetSchema = new Schema({
  _id: { type: String, required: true },           // mã đề writing, ví dụ W2025_01
  title: String,                                   // "TOEIC Writing - Email về complaint"
  taskType: { type: String, enum: ["email", "opinion_essay", "picture"] },
  prompt: { type: String, required: true },        // đề bài
  minWords: { type: Number, default: 120 },
  maxWords: { type: Number, default: 300 },
  year: Number,                                    // 2022, 2023, 2024...
  maxScore: { type: Number, default: 200 },        // thang điểm thực tế
  rubric: { type: String },                        // mô tả rubric TOEIC rút gọn
  status: { type: String, enum: ["draft", "published"], default: "published" },
}, { timestamps: true });

export default model("ToeicWritingSet", ToeicWritingSetSchema);
