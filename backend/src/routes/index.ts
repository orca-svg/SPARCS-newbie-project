import { Router } from "express";
import postsRouter from "./posts.route.ts";
import authRouter from "./auth.route.ts";
import clubsRouter from "./clubs.route.ts";
import { AuthController } from "../controllers/auth.controller.ts";
import { authMiddleware } from "../middleware/auth.ts";



const router = Router();

router.use("/", postsRouter);
router.use("/auth", authRouter);
router.use("/clubs", clubsRouter);
router.get("/me", authMiddleware, AuthController.me);


export default router; 
