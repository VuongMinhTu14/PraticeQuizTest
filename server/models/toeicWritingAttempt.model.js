// models/toeicWritingAttempt.model.js
import { Schema, model } from "mongoose";

const WritingAnswerSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "ToeicWritingQuestion",
      required: true,
    },
    number: Number,
    partKey: String,
    taskType: String,
    answerText: String,
    wordCount: Number,
    ai: {
      taskScore: Number,
      grammarScore: Number,
      vocabularyScore: Number,
      organizationScore: Number,
      overallScore: Number,
      predictedToeicScore: Number,
      toeicWritingLevel: Number,
      bands: {
        task: String,
        grammar: String,
        vocabulary: String,
        organization: String,
      },
      feedback: String,
      studyPlan: [String],
    },
  },
  { _id: false }
);

const ToeicWritingAttemptSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    setId: {
      type: String,
      ref: "ToeicWritingSet",
      required: true,
    },
    mode: {
      type: String,
      enum: ["full", "part"],
      default: "full",
    },
    selectedParts: [String], // ["w1_5", "w6_7", "w8"]
    timeLimitSec: { type: Number, default: null },
    isSubmitted: { type: Boolean, default: false },
    submittedAt: Date,
    answers: [WritingAnswerSchema],
    summary: {
      totalQuestions: Number,
      answered: Number,
      avgTaskScore: Number,
      avgGrammarScore: Number,
      avgVocabularyScore: Number,
      avgOrganizationScore: Number,
      avgOverallScore: Number,
      predictedToeicScore: Number, // 0–200
    },
  },
  { timestamps: true }
);

const ToeicWritingAttempt = model("ToeicWritingAttempt",ToeicWritingAttemptSchema);
export default ToeicWritingAttempt;
