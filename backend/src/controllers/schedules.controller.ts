import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.ts";
import ScheduleService from "../services/schedules.service.ts";

export default class SchedulesController {
  static async listByClub(req: AuthRequest, res: Response) {
    try {
      // 1) 로그인 여부 확인
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      // 2) clubId 파라미터 검증
      const clubId = Number(req.params.clubId);
      if (Number.isNaN(clubId)) {
        return res
          .status(400)
          .json({ message: "잘못된 동아리 ID입니다." });
      }

      // 3) 쿼리 파라미터 파싱
      const fromRaw = req.query.from as string | undefined;
      const toRaw = req.query.to as string | undefined;
      const limitRaw = req.query.limit as string | undefined;

      let from: Date | undefined;
      let to: Date | undefined;
      let limit: number | undefined;

      if (fromRaw) {
        const d = new Date(fromRaw);
        if (Number.isNaN(d.getTime())) {
          return res
            .status(400)
            .json({ message: "from 날짜 형식이 올바르지 않습니다." });
        }
        from = d;
      }

      if (toRaw) {
        const d = new Date(toRaw);
        if (Number.isNaN(d.getTime())) {
          return res
            .status(400)
            .json({ message: "to 날짜 형식이 올바르지 않습니다." });
        }
        to = d;
      }

      if (limitRaw) {
        const n = Number(limitRaw);
        if (Number.isNaN(n) || n <= 0) {
          return res
            .status(400)
            .json({ message: "limit 값이 올바르지 않습니다." });
        }
        limit = n;
      }

      // 4) 서비스 호출
      const schedules = await ScheduleService.listByClub(
        clubId,
        req.user.userId,
        { from, to, limit },
      );

      return res.json({ schedules });
    } catch (e: any) {
      // 권한 관련 메시지는 403으로 매핑
      if (
        typeof e.message === "string" &&
        e.message.includes("동아리의 멤버만")
      ) {
        return res.status(403).json({ message: e.message });
      }

      console.error(e);
      return res.status(400).json({ message: e.message ?? "일정 조회 중 오류가 발생했습니다." });
    }
  }

  /**
   * POST /api/clubs/:clubId/schedules
   * - 특정 동아리의 일정 생성
   * - body: { title, date, content? }
   */
static async create(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const clubId = Number(req.params.clubId);
    if (Number.isNaN(clubId)) {
      return res
        .status(400)
        .json({ message: "잘못된 동아리 ID입니다." });
    }

    const { title, startAt, endAt, content } = req.body as {
      title?: string;
      startAt?: string;
      endAt?: string;
      content?: string;
    };

    if (!title || !startAt || !endAt) {
      return res
        .status(400)
        .json({ message: "제목, 시작일, 종료일은 필수입니다." });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res
        .status(400)
        .json({ message: "날짜 형식이 올바르지 않습니다." });
    }

    if (endDate < startDate) {
      return res
        .status(400)
        .json({ message: "종료일은 시작일 이후여야 합니다." });
    }

    const schedule = await ScheduleService.createSchedule(
        clubId,
        req.user.userId,
        {
          title,
          startAt: startDate,
          endAt: endDate,
          content,
        },
      );

      return res.status(201).json({ schedule });
    } catch (e: any) {
      if (
        typeof e.message === "string" &&
        (
          e.message.includes("동아리의 멤버만") ||
          e.message.includes("WRITER 또는 LEADER만")
        )
      ) {
        // 🔹 권한 관련 에러는 403
        return res.status(403).json({ message: e.message });
      }

      console.error(e);
      return res
        .status(400)
        .json({ message: e.message ?? "일정 생성 중 오류가 발생했습니다." });
    }
  }

  // 일정 수정
  static async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      const scheduleId = Number(req.params.scheduleId);

      if (Number.isNaN(clubId) || Number.isNaN(scheduleId)) {
        return res
          .status(400)
          .json({ message: "잘못된 동아리 또는 일정 ID입니다." });
      }

      const { title, startAt, endAt, content } = req.body as {
        title?: string;
        startAt?: string;
        endAt?: string;
        content?: string;
      };

      const data: {
        title?: string;
        startAt?: Date;
        endAt?: Date;
        content?: string;
      } = {};

      if (title !== undefined) data.title = title;
      if (content !== undefined) data.content = content;
      if (startAt) {
        const d = new Date(startAt);
        if (Number.isNaN(d.getTime())) {
          return res
            .status(400)
            .json({ message: "startAt 날짜 형식이 올바르지 않습니다." });
        }
        data.startAt = d;
      }
      if (endAt) {
        const d = new Date(endAt);
        if (Number.isNaN(d.getTime())) {
          return res
            .status(400)
            .json({ message: "endAt 날짜 형식이 올바르지 않습니다." });
        }
        data.endAt = d;
      }

      const updated = await ScheduleService.updateSchedule(
        scheduleId,
        req.user.userId,
        data,
      );

      // clubId가 맞는지 간단히 체크 (틀리면 400)
      if (updated.clubId !== clubId) {
        return res
          .status(400)
          .json({ message: "해당 동아리의 일정이 아닙니다." });
      }

      return res.json({ schedule: updated });
    } catch (e: any) {
      if (
        typeof e.message === "string" &&
        (e.message.includes("동아리의 멤버만") ||
          e.message.includes("리더 또는 작성자만"))
      ) {
        return res.status(403).json({ message: e.message });
      }

      console.error(e);
      return res
        .status(400)
        .json({ message: e.message ?? "일정 수정 중 오류가 발생했습니다." });
    }
  }

  /**
   * DELETE /api/clubs/:clubId/schedules/:scheduleId
   */
  static async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      const scheduleId = Number(req.params.scheduleId);

      if (Number.isNaN(clubId) || Number.isNaN(scheduleId)) {
        return res
          .status(400)
          .json({ message: "잘못된 동아리 또는 일정 ID입니다." });
      }

      await ScheduleService.deleteSchedule(scheduleId, req.user.userId);

      // (clubId 체크는 서비스 내부에서 clubId로 권한 확인하면서 자연스럽게 이루어짐)
      return res.status(204).send();
    } catch (e: any) {
      if (
        typeof e.message === "string" &&
        (e.message.includes("동아리의 멤버만") ||
          e.message.includes("리더 또는 작성자만"))
      ) {
        return res.status(403).json({ message: e.message });
      }

      console.error(e);
      return res
        .status(400)
        .json({ message: e.message ?? "일정 삭제 중 오류가 발생했습니다." });
    }
  }
}
