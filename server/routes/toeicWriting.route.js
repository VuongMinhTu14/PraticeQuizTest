// routes/toeicWriting.route.js
import { Router } from "express";
import { verifyToken, requireAdmin } from "../middlewares/verifyToken.js";

import {
  // user side
  listWritingSets,
  getWritingSet,
  createWritingAttempt,
  getWritingAttempt,
  submitWritingAttempt,
  submitWritingAttemptLlama,
  getWritingLastAttempt,
  getMyWritingRecentAttempts,
  getWritingQuestions,
  getWritingAttemptReview,

  // admin
  adminListWritingSets,
  adminCreateWritingSet,
  adminUpdateWritingSet,
  adminDeleteWritingSet,
  adminListWritingQuestions,
  adminImportWritingQuestions,
  adminCreateWritingQuestion,
  adminUpdateWritingQuestion,
  adminDeleteWritingQuestion,
  adminUploadWritingQuestionImage,
} from "../controllers/toeicWriting.controller.js";

const router = Router();

/* ---------- PUBLIC ---------- */
router.get("/sets", listWritingSets);
router.get("/sets/:id", getWritingSet);

/* ---------- USER / PRACTICE ---------- */
router.post("/sets/:id/attempts", verifyToken, createWritingAttempt);
router.get("/attempts/:id", verifyToken, getWritingAttempt);
router.get("/sets/:setId/questions", getWritingQuestions);
router.post("/attempts/:attemptId/submit", verifyToken, submitWritingAttempt);
router.post("/attempts/:attemptId/submit-llama", verifyToken, submitWritingAttemptLlama);
router.get("/sets/:id/last-attempt", verifyToken, getWritingLastAttempt);
router.get("/my/recent-attempts", verifyToken, getMyWritingRecentAttempts);
router.get("/attempts/:id/review", verifyToken, getWritingAttemptReview);

/* ---------- ADMIN – SETS ---------- */
router.get("/admin/sets", verifyToken, requireAdmin, adminListWritingSets);
router.post("/admin/sets", verifyToken, requireAdmin, adminCreateWritingSet);
router.put("/admin/sets/:id", verifyToken, requireAdmin, adminUpdateWritingSet);
router.delete("/admin/sets/:id", verifyToken, requireAdmin, adminDeleteWritingSet);

/* ---------- ADMIN – QUESTIONS ---------- */
router.get("/admin/sets/:setId/questions", verifyToken, requireAdmin, adminListWritingQuestions);
router.post("/admin/sets/:setId/questions/import", verifyToken, requireAdmin, adminImportWritingQuestions);
router.post("/admin/sets/:setId/questions", verifyToken, requireAdmin, adminCreateWritingQuestion);
router.put("/admin/questions/:id", verifyToken, requireAdmin, adminUpdateWritingQuestion);
router.delete("/admin/questions/:id", verifyToken, requireAdmin, adminDeleteWritingQuestion);
router.post("/admin/questions/:id/upload-image", verifyToken, requireAdmin, adminUploadWritingQuestionImage);

export default router;
