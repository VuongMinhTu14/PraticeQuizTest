// routes/admin.route.js
import { Router } from "express";
import { listUsers, updateUser, deleteUser } from "../controllers/admin.controller.js";
// import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

router.get("/users", /* verifyToken, */ listUsers);
router.patch("/users/:id", /* verifyToken, */ updateUser);
router.delete("/users/:id", /* verifyToken, */ deleteUser);

export default router;
