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

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(fileUpload());

app.use('/user', userRouter)
app.use('/toeic', toeicRouter);
app.use("/admin", adminRouter); 

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({
    ok: false,
    msg: err.message || "Something went wrong",
  });
});


app.listen(process.env.PORT || 3000, () => {
    connectDB();
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});