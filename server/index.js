import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import connectDB from "./utils/connectDB.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import userRouter from "./routes/user.route.js";
import toeicRouter from "./routes/toeic.route.js";
import adminRouter from "./routes/admin.route.js";
import toeicWritingRouter from "./routes/toeicWriting.route.js";
import predictionRouter from "./routes/prediction.route.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(
  fileUpload({
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    useTempFiles: false,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/user", userRouter);
app.use("/toeic", toeicRouter);
app.use("/admin", adminRouter);
app.use("/toeic-writing", toeicWritingRouter);
app.use("/prediction", predictionRouter);

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({
    ok: false,
    msg: err.message || "Something went wrong",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
