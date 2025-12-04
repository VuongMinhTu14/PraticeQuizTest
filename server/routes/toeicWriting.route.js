// routes/toeicWriting.route.js
import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken.js";

import {
  // user side
  listWritingSets,
  getWritingSet,
  createWritingAttempt,
  getWritingAttempt,
  submitWritingAttempt,
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
router.get("/sets/:id/last-attempt", verifyToken, getWritingLastAttempt);
router.get("/my/recent-attempts", verifyToken, getMyWritingRecentAttempts);
router.get("/attempts/:id/review", verifyToken, getWritingAttemptReview);

/* ---------- ADMIN – SETS ---------- */
router.get("/admin/sets", /* verifyToken, */ adminListWritingSets);
router.post("/admin/sets", /* verifyToken, */ adminCreateWritingSet);
router.put("/admin/sets/:id", /* verifyToken, */ adminUpdateWritingSet);
router.delete("/admin/sets/:id", /* verifyToken, */ adminDeleteWritingSet);

/* ---------- ADMIN – QUESTIONS ---------- */
router.get("/admin/sets/:setId/questions",/* verifyToken, */ adminListWritingQuestions);
router.post("/admin/sets/:setId/questions/import",/* verifyToken, */ adminImportWritingQuestions);
router.post("/admin/sets/:setId/questions",/* verifyToken, */ adminCreateWritingQuestion);
router.put("/admin/questions/:id",/* verifyToken, */ adminUpdateWritingQuestion);
router.delete("/admin/questions/:id",/* verifyToken, */ adminDeleteWritingQuestion);
router.post("/admin/questions/:id/upload-image",/* verifyToken, */ adminUploadWritingQuestionImage);

export default router;
