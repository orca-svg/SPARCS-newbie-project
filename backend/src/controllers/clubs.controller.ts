import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.ts";
import { ClubService } from "../services/clubs.service.ts";

export class ClubController {
  // GET /api/clubs
  static async getAll(_req: Request, res: Response) {
    try {
      const clubs = await ClubService.listAll();
      return res.json({ clubs });
    } catch (e: any) {
      return res
        .status(500)
        .json({ message: e.message ?? "동아리 목록을 가져오지 못했습니다." });
    }
  }

  // GET /api/clubs/my
  static async getMy(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const clubs = await ClubService.listMy(req.user.userId);
      return res.json({ clubs });
    } catch (e: any) {
      return res
        .status(500)
        .json({ message: e.message ?? "내 동아리 목록을 가져오지 못했습니다." });
    }
  }

  // GET /api/clubs/:id
  static async getOne(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ message: "유효하지 않은 동아리 ID입니다." });
      }

      const club = await ClubService.getById(id);
      if (!club) {
        return res
          .status(404)
          .json({ message: "동아리를 찾을 수 없습니다." });
      }

      return res.json({ club });
    } catch (e: any) {
      return res
        .status(500)
        .json({ message: e.message ?? "동아리 정보를 가져오지 못했습니다." });
    }
  }

  // POST /api/clubs/:clubId/join
  static async requestJoin(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      if (Number.isNaN(clubId)) {
        return res
          .status(400)
          .json({ message: "유효하지 않은 동아리 ID입니다." });
      }

      const userId = req.user.userId;

      const result = await ClubService.requestJoin(clubId, userId);

      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({
        message: e.message ?? "가입 요청에 실패했습니다.",
      });
    }
  }

  // GET /api/clubs/:clubId/requests
  static async listJoinRequests(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      if (Number.isNaN(clubId)) {
        return res
          .status(400)
          .json({ message: "유효하지 않은 동아리 ID입니다." });
      }

      const requests = await ClubService.listJoinRequests(
        clubId,
        req.user.userId,
        req.user.role,
      );

      return res.json({ requests });
    } catch (e: any) {
      // 권한 문제  403 처리
      return res.status(403).json({
        message: e.message ?? "가입 요청 목록을 가져오지 못했습니다.",
      });
    }
  }

  // POST /api/clubs/:clubId/members/:memberId/approve
  static async approveMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      const memberId = Number(req.params.memberId);
      if (Number.isNaN(clubId) || Number.isNaN(memberId)) {
        return res
          .status(400)
          .json({ message: "유효하지 않은 파라미터입니다." });
      }

      const updated = await ClubService.approveMember(
        clubId,
        memberId,
        req.user.userId,
        req.user.role,
      );

      return res.json({ member: updated });
    } catch (e: any) {
      return res.status(400).json({
        message: e.message ?? "가입 승인에 실패했습니다.",
      });
    }
  }

  // POST /api/clubs/:clubId/members/:memberId/reject
  static async rejectMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      const memberId = Number(req.params.memberId);
      if (Number.isNaN(clubId) || Number.isNaN(memberId)) {
        return res
          .status(400)
          .json({ message: "유효하지 않은 파라미터입니다." });
      }

      const result = await ClubService.rejectMember(
        clubId,
        memberId,
        req.user.userId,
        req.user.role,
      );

      return res.json(result);
    } catch (e: any) {
      return res.status(400).json({
        message: e.message ?? "가입 거절에 실패했습니다.",
      });
    }
  }
  // POST /api/clubs
  static async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const { name, description } = req.body ?? {};

      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "동아리 이름은 필수입니다." });
      }

      const normalized = name.trim().toLowerCase();
      // 중복 이름 확인 (대소문자 구분 없이)
      const allClubs = await ClubService.listAll();
      const exists = allClubs?.some(
        (c: any) => typeof c.name === "string" && c.name.trim().toLowerCase() === normalized,
      );

      if (exists) {
        return res.status(409).json({ message: "이미 존재하는 동아리 이름입니다." });
      }

      const club = await ClubService.createClub({
        name,
        description,
        creatorUserId: req.user.userId,
      });

      return res.status(201).json({ club });
    } catch (e: any) {
      return res
        .status(400)
        .json({ message: e.message ?? "동아리를 생성하지 못했습니다." });
    }
  }
  static async listMembers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      if (Number.isNaN(clubId)) {
        return res.status(400).json({ message: "잘못된 동아리 ID입니다." });
      }

      const members = await ClubService.listMembers(
        clubId,
        req.user.userId,
      );

      return res.json({ members });
    } catch (e: any) {
      if (
        typeof e.message === "string" &&
        e.message.includes("동아리의 승인된 멤버만")
      ) {
        return res.status(403).json({ message: e.message });
      }

      console.error(e);
      return res
        .status(400)
        .json({ message: e.message ?? "멤버 목록 조회 중 오류가 발생했습니다." });
    }
  }
}

export default ClubController;
