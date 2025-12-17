import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import ToeicSet from "../models/toeicSet.model.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO);

  const data = {
    _id: "ts_2024_set7",
    title: "2024 Practice Set TOEIC Test 7",
    durationSec: 120 * 60,
    totalQuestions: 200,
    isFree: true,
    parts: [
      { key: "p1", name: "Part 1", questions: 6,  tags: ["Tranh tả người","Tranh tả vật"], order: 1 },
      { key: "p2", name: "Part 2", questions: 25, tags: ["WHAT","WHO","WHERE","WHEN","HOW","WHY","YES/NO"], order: 2 },
      { key: "p3", name: "Part 3", questions: 39, tags: ["Mục đích","Địa điểm","Chi tiết cuộc hội thoại"], order: 3 },
      { key: "p4", name: "Part 4", questions: 30, tags: ["Announcement","Advertisement","News report"], order: 4 },
      { key: "p5", name: "Part 5", questions: 30, tags: ["Ngữ pháp","Từ vựng"], order: 5 },
      { key: "p6", name: "Part 6", questions: 16, tags: ["Email/Letter","Article/Review","Liên từ"], order: 6 },
      { key: "p7", name: "Part 7", questions: 54, tags: ["Một đoạn","Nhiều đoạn","Email/Letter","Article/Review"], order: 7 },
    ],
    status: "published",
    stats: { attempts: 626439, comments: 749 },
  };

  await ToeicSet.deleteMany({});
  await ToeicSet.create(data);
  console.log("Seeded:", data._id);
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
