import { Router } from "express";
import { listSets, getSet, createAttempt } from "../controllers/toeic.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js"; // file middleware bạn đã gửi

const router = Router();

router.get("/sets", listSets);
router.get("/sets/:id", getSet);
router.post("/sets/:id/attempts", verifyToken, createAttempt); // cần token

export default router;
