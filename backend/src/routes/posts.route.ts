import { Router } from "express";
import { getPosts } from "../controllers/posts.controller.ts";
// import { authMiddleware } from "../middleware/auth";  // 나중에 보호 필요시 사용

const router = Router();

// GET /api/posts
router.get("/", getPosts);

export default router;
