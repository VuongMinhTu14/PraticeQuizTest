import mongoose, { Schema } from "mongoose";

const ToeicAttemptSchema = new Schema(
  {
    setId:   { 
        type: String, 
        ref: "ToeicSet", 
        required: true 
    },
    userId:  { 
        type: String, 
        ref: "User", 
        required: true 
    },
    selectedParts: { 
        type: [String], 
        required: true 
    },
    timeLimitSec:  { 
        type: Number, 
        default: null 
    },
    status: { 
        type: String, 
        enum: ["active","submitted","expired"], 
        default: "active" 
    },
    startedAt:   { 
        type: Date, 
        default: Date.now 
    },
    submittedAt: { 
        type: Date, 
        default: null 
    },
    scoreRaw: { 
        type: Number, 
        default: null 
    },
    scorePercent: { 
        type: Number, 
        default: null 
    }
  },
  { timestamps: true }
);

export default mongoose.model("ToeicAttempt", ToeicAttemptSchema);
