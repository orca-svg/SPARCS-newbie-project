// backend/src/controllers/clubs.controller.ts
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
  static async getOne(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 동아리 ID입니다." });
      }

      const club = await ClubService.getById(id);
      if (!club) {
        return res.status(404).json({ message: "동아리를 찾을 수 없습니다." });
      }

      return res.json({ club });
    } catch (e: any) {
      return res
        .status(500)
        .json({ message: e.message ?? "동아리 정보를 가져오지 못했습니다." });
    }
  }
}

export default ClubController;
