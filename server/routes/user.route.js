// routes/auth.route.js
import { Router } from 'express'
import { 
    register, 
    login,
    getMe,
    updateProfile,
    uploadAvatar,
    changePassword, 
} from '../controllers/user.controller.js'
import { verifyToken } from "../middlewares/verifyToken.js";
    
const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", verifyToken, getMe);
router.patch("/profile", verifyToken, updateProfile);
router.post("/avatar", verifyToken, uploadAvatar);
router.post("/change-password", verifyToken, changePassword);

export default router;