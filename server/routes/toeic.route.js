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
} 
from "../controllers/toeic.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

router.get("/sets", listSets);
router.get("/sets/:id", getSet);
router.get("/attempts/:id", getAttempt); 
router.post("/sets/:id/attempts", verifyToken, createAttempt);
router.post("/attempts/:id/submit", verifyToken, submitAttempt);
router.get("/sets/:id/last-attempt", verifyToken, getToeicLastAttempt);
router.get("/my/recent-attempts", verifyToken, getMyToeicRecentAttempts);

//ADMIN
router.get("/admin/sets", adminListSets);
router.post("/admin/sets", adminCreateSet);
router.put("/admin/sets/:id", adminUpdateSet);
router.delete("/admin/sets/:id", adminDeleteSet);

//ADMIN - QUESTIONS
router.get("/admin/sets/:setId/questions", adminListQuestions);
router.post("/admin/sets/:setId/questions", adminCreateQuestion);
router.put("/admin/questions/:id", adminUpdateQuestion);
router.delete("/admin/questions/:id", adminDeleteQuestion);
router.post("/admin/sets/:setId/questions/import", adminImportQuestions);

//PUBLIC - QUESTIONS
router.get("/sets/:id/questions", listQuestionsForUser);


export default router;
