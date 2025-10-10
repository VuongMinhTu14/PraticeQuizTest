import { Schema } from "mongoose";
import mongoose from "mongoose";

const userSchema = new Schema(
  {
    displayName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 0,
    } 
  },
  { timestamps: true }
);

export default mongoose.model("User",userSchema)