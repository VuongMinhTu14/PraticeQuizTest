// routes/toeicWriting.route.js
import { Router } from "express";
import {
  listWritingSets,
  getWritingSet,
  adminListWritingSets,
  adminCreateWritingSet,
  adminUpdateWritingSet,
  adminDeleteWritingSet,
  createWritingAttempt,
  getWritingAttempt,
  getWritingLastAttempt,
  getMyWritingRecentAttempts,
} from "../controllers/toeicWriting.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

// PUBLIC
router.get("/sets", listWritingSets);
router.get("/sets/:id", getWritingSet);

// USER - ATTEMPT
router.post("/sets/:id/attempts", verifyToken, createWritingAttempt);
router.get("/attempts/:id", verifyToken, getWritingAttempt);
router.get("/sets/:id/last-attempt", verifyToken, getWritingLastAttempt);
router.get("/my/recent-attempts", verifyToken, getMyWritingRecentAttempts);

// ADMIN
router.get("/admin/sets", /* verifyToken, */ adminListWritingSets);
router.post("/admin/sets", /* verifyToken, */ adminCreateWritingSet);
router.put("/admin/sets/:id", /* verifyToken, */ adminUpdateWritingSet);
router.delete("/admin/sets/:id", /* verifyToken, */ adminDeleteWritingSet);

export default router;
