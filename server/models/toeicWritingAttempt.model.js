import mongoose from "mongoose";

const ScoreSchema = new mongoose.Schema(
  {
    taskScore: { type: Number, min: 0, max: 5 },
    grammarScore: { type: Number, min: 0, max: 5 },
    vocabularyScore: { type: Number, min: 0, max: 5 },
    organizationScore: { type: Number, min: 0, max: 5 },
    overallScore: { type: Number, min: 0, max: 5 },
    predictedToeicScore: { type: Number, min: 0, max: 300 },
  },
  { _id: false }
);

const ToeicWritingAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    setId: {
      type: String, // _id của ToeicWritingSet
      ref: "ToeicWritingSet",
      required: true,
    },

    answerText: { type: String, required: true },

    scores: ScoreSchema,

    feedback: { type: String },

    // để sau muốn lọc/analytics
    level: { type: String, default: "TOEIC" },
  },
  { timestamps: true }
);

const ToeicWritingAttempt = mongoose.model(
  "ToeicWritingAttempt",
  ToeicWritingAttemptSchema
);

export default ToeicWritingAttempt;
