import { Router } from "express";
import { 
  listSets,
  getSet,
  createAttempt,
  getAttempt,
  submitAttempt,
  getToeicLastAttempt,
  adminListSets,
  adminCreateSet,
  adminUpdateSet,
  adminDeleteSet,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminImportQuestions,
  listQuestionsForUser,
  getMyToeicRecentAttempts,
  adminUploadQuestionImage,
  adminUploadQuestionAudio,
  getAttemptReview,
} 
from "../controllers/toeic.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/verifyToken.js";

const router = Router();

router.get("/sets", listSets);
router.get("/sets/:id", getSet);
router.get("/attempts/:id", getAttempt); 
router.post("/sets/:id/attempts", verifyToken, createAttempt);
router.post("/attempts/:id/submit", verifyToken, submitAttempt);
router.get("/sets/:id/last-attempt", verifyToken, getToeicLastAttempt);
router.get("/my/recent-attempts", verifyToken, getMyToeicRecentAttempts);

//ADMIN
router.get("/admin/sets", verifyToken, requireAdmin, adminListSets);
router.post("/admin/sets", verifyToken, requireAdmin, adminCreateSet);
router.put("/admin/sets/:id", verifyToken, requireAdmin, adminUpdateSet);
router.delete("/admin/sets/:id", verifyToken, requireAdmin, adminDeleteSet);

//ADMIN - QUESTIONS
router.get("/admin/sets/:setId/questions", verifyToken, requireAdmin, adminListQuestions);
router.post("/admin/sets/:setId/questions", verifyToken, requireAdmin, adminCreateQuestion);
router.put("/admin/questions/:id", verifyToken, requireAdmin, adminUpdateQuestion);
router.delete("/admin/questions/:id", verifyToken, requireAdmin, adminDeleteQuestion);
router.post("/admin/sets/:setId/questions/import", verifyToken, requireAdmin, adminImportQuestions);

//PUBLIC - QUESTIONS
router.get("/sets/:id/questions", listQuestionsForUser);
router.post("/admin/questions/:id/upload-image", verifyToken, requireAdmin, adminUploadQuestionImage);
router.post("/admin/questions/:id/upload-audio", verifyToken, requireAdmin, adminUploadQuestionAudio);
router.get("/attempts/:id/review", verifyToken, getAttemptReview);

export default router;
