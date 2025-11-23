import { Router } from "express";
import { ClubController } from "../controllers/clubs.controller.ts";
import { authMiddleware } from "../middleware/auth.ts";

const router = Router();
// 모든 동아리 목록
router.get("/", ClubController.getAll);

// 내가 가입한 동아리 목록
router.get("/my", authMiddleware, ClubController.getMy);

// 특정 동아리 정보
router.get("/:id", ClubController.getOne);

export default router;
