// routes/admin.route.js
import { Router } from "express";
import {
  listUsers,
  updateUser,
  deleteUser,
  resetUserPoints,
} from "../controllers/admin.controller.js";
import { getAdminOverview } from "../controllers/adminStats.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/verifyToken.js";

const router = Router();

router.get("/users", verifyToken, requireAdmin, listUsers);
router.patch("/users/:id", verifyToken, requireAdmin, updateUser);
router.post("/users/:id/reset-points", verifyToken, requireAdmin, resetUserPoints);
router.delete("/users/:id", verifyToken, requireAdmin, deleteUser);

router.get("/stats/overview", verifyToken, requireAdmin, getAdminOverview);

export default router;
