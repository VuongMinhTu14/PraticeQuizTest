// models/toeicWritingSet.model.js
import { Schema, model } from "mongoose";

const WritingPartSchema = new Schema(
  {
    key: { type: String, required: true }, 
    name: String,                          
    questions: { type: Number, default: 0 },
    order: { type: Number, default: 1 },
    tags: [String],
  },
  { _id: false }
);

const ToeicWritingSetSchema = new Schema(
  {
    _id: { type: String, required: true }, // ví dụ: TW_2025_SET1
    title: { type: String, required: true },
    durationSec: { type: Number, default: 60 * 60 }, 
    totalQuestions: { type: Number, default: 8 },
    isFree: { type: Boolean, default: true },

    parts: {
      type: [WritingPartSchema],
      default: [
        {
          key: "w1_5",
          name: "Questions 1–5 - Picture",
          questions: 5,
          order: 1,
          tags: ["picture", "sentence"],
        },
        {
          key: "w6_7",
          name: "Questions 6–7 - Email response",
          questions: 2,
          order: 2,
          tags: ["email"],
        },
        {
          key: "w8",
          name: "Question 8 - Opinion essay",
          questions: 1,
          order: 3,
          tags: ["essay"],
        },
      ],
    },

    description: String,
    level: String,
    year: Number,
    source: String,
    tags: [String],

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    stats: {
      attempts: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      avgScore: { type: Number, default: 0 }, // 0–200
    },
  },
  { timestamps: true }
);

const ToeicWritingSet = model("ToeicWritingSet", ToeicWritingSetSchema);
export default ToeicWritingSet;
