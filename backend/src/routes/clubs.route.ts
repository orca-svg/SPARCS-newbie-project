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

// 동아리 가입 신청
router.post("/:clubId/join", authMiddleware, ClubController.requestJoin);

// 가입 요청 목록 (리더/ADMIN)
router.get(
  "/:clubId/requests",
  authMiddleware,
  ClubController.listJoinRequests,
);

// 가입 승인
router.post(
  "/:clubId/members/:memberId/approve",
  authMiddleware,
  ClubController.approveMember,
);

// 가입 거절
router.post(
  "/:clubId/members/:memberId/reject",
  authMiddleware,
  ClubController.rejectMember,
);

export default router;