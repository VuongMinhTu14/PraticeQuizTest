import mongoose from "mongoose";

const choiceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // A,B,C,D
    text: { type: String, required: true },
  },
  { _id: false }
);

const toeicQuestionSchema = new mongoose.Schema(
  {
    setId: { type: String, required: true },
    partKey: { type: String, required: true }, // "p1".."p7"
    number: { type: Number, required: true },

    questionText: { type: String, required: true },
    choices: { type: [choiceSchema], default: [] },
    correctOption: { type: String, required: true },
    explanation: String,

    // MEDIA
    imageUrl: String, // P1: photo; P6–7: image chứa đoạn văn
    audioUrl: String, // P1–4: audio

    // Group đoạn văn (P3,4,6,7)
    // Với P6–7: nhiều câu cùng passageId => chung 1 ảnh đoạn văn
    passageId: String,        // vd: "P7_147_148", "P6_131_134"
    passageOrder: Number,     // (optional) 1,2,3 cho triple
    passageText: String,      // (optional) nếu sau này muốn lưu text
  },
  { timestamps: true }
);

toeicQuestionSchema.index(
  { setId: 1, partKey: 1, number: 1 },
  { unique: true }
);

export default mongoose.model("ToeicQuestion", toeicQuestionSchema);
