import mongoose, { Schema } from "mongoose";

const PartSchema = new Schema(
  {
    key: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    questions: { 
        type: Number, 
        required: true 
    },
    tags: [
        String
    ],  
    media: { 
        type: Object 
    },
    order: { 
        type: Number, 
        default: 1 
    }
  },
  { _id: false }
);

const ToeicSetSchema = new Schema(
  {
    _id: { 
        type: String, 
        required: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    durationSec: { 
        type: Number, 
        required: true 
    },
    totalQuestions: { 
        type: Number, 
        required: true 
    },
    parts: { 
        type: [PartSchema], 
        default: [] 
    },
    isFree: { 
        type: Boolean, 
        default: true 
    },
    status: { 
        type: String, 
        enum: ["draft", "published"], 
        default: "draft" 
    },
    stats: {
      attempts: { 
        type: Number, 
        default: 0 
    },
      comments: { 
        type: Number, 
        default: 0 
    },
    },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("ToeicSet", ToeicSetSchema);