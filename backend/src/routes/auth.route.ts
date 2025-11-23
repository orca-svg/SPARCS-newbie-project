// src/routes/auth.route.ts
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.ts";
import { authMiddleware } from "../middleware/auth.ts";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/me", authMiddleware, AuthController.me);

export default router;
