// models/toeicWritingQuestion.model.js
import { Schema, model } from "mongoose";

const ToeicWritingQuestionSchema = new Schema(
  {
    setId: {
      type: String,
      ref: "ToeicWritingSet",
      required: true,
    },
    number: { type: Number, required: true }, // 1..8
    partKey: {
      type: String,
      enum: ["w1_5", "w6_7", "w8"],
      required: true,
    },
    taskType: {
      type: String,
      enum: ["picture", "email", "opinion_essay", "other"],
      required: true,
    },
    prompt: { type: String, required: true },
    subPrompt: String,
    imageUrl: String, 
    wordPair: String, 
    instructions: String,
    minWords: { type: Number, default: 0 },
    maxWords: { type: Number, default: 300 },
    rubric: String,
    groupKey: String, 
    tags: [String],
  },
  { timestamps: true }
);

ToeicWritingQuestionSchema.index({ setId: 1, number: 1 }, { unique: true });

const ToeicWritingQuestion = model("ToeicWritingQuestion",ToeicWritingQuestionSchema);
export default ToeicWritingQuestion;
