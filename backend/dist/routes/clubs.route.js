import { Router } from "express";
import { ClubController } from "../controllers/clubs.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import SchedulesController from "../controllers/schedules.controller.js";
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
router.get("/:clubId/requests", authMiddleware, ClubController.listJoinRequests);
// 가입 승인
router.post("/:clubId/members/:memberId/approve", authMiddleware, ClubController.approveMember);
// 가입 거절
router.post("/:clubId/members/:memberId/reject", authMiddleware, ClubController.rejectMember);
// 동아리 생성
router.post("/", authMiddleware, ClubController.create);
// 동아리 일정 목록 조회
router.get("/:clubId/schedules", authMiddleware, SchedulesController.listByClub);
router.post("/:clubId/schedules", authMiddleware, SchedulesController.create);
router.patch("/:clubId/schedules/:scheduleId", authMiddleware, SchedulesController.update);
router.delete("/:clubId/schedules/:scheduleId", authMiddleware, SchedulesController.delete);
//멤버 목록 조회
router.get("/:clubId/members", authMiddleware, ClubController.listMembers);
router.patch("/:clubId/members/:memberId", authMiddleware, ClubController.updateMemberRoleTier);
router.delete("/:clubId/members/:memberId", authMiddleware, ClubController.removeMember);
export default router;
