import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { getMyLatestPrediction } from "../controllers/prediction.controller.js";

const router = Router();

router.get("/my/latest", verifyToken, getMyLatestPrediction);

export default router;
