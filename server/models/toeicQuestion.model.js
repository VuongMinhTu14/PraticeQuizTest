import mongoose from "mongoose";

const choiceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // A, B, C, D
    text: { type: String, required: true },
  },
  { _id: false }
);

const toeicQuestionSchema = new mongoose.Schema(
  {
    setId: {
      type: String, // trùng với _id của ToeicSet, ví dụ "ts_2024_set7"
      required: true,
    },
    partKey: {
      type: String, // "p1"..."p7"
      required: true,
    },
    number: {
      type: Number, // số câu trong đề tổng (1–200) hoặc số thứ tự trong part
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    choices: {
      type: [choiceSchema],
      default: [],
    },
    correctOption: {
      type: String, // "A", "B", "C", "D"
      required: true,
    },
    explanation: {
      type: String,
    },
    imageUrl: String, // Part 1
    audioUrl: String, // Part 1–4
    passageId: String, // để group các câu cùng 1 đoạn Part 3–4–7 sau này
  },
  { timestamps: true }
);

toeicQuestionSchema.index({ setId: 1, partKey: 1, number: 1 }, { unique: true });

const ToeicQuestion = mongoose.model("ToeicQuestion", toeicQuestionSchema);

export default ToeicQuestion;
