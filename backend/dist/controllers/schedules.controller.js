import ScheduleService from "../services/schedules.service.js";
import { createScheduleSchema, updateScheduleSchema, } from "../validation/schemas.js";
import { parseBody } from "../validation/parse.js";
export default class SchedulesController {
    static async listByClub(req, res) {
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
            const fromRaw = req.query.from;
            const toRaw = req.query.to;
            const limitRaw = req.query.limit;
            let from;
            let to;
            let limit;
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
            const schedules = await ScheduleService.listByClub(clubId, req.user.userId, { from, to, limit });
            return res.json({ schedules });
        }
        catch (e) {
            if (typeof e.message === "string" &&
                e.message.includes("동아리의 멤버만")) {
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
    static async create(req, res) {
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
            const parsed = parseBody(createScheduleSchema, req.body);
            const schedule = await ScheduleService.createSchedule(clubId, req.user.userId, {
                title: parsed.title,
                startAt: new Date(parsed.startAt),
                endAt: new Date(parsed.endAt),
                content: parsed.content ?? null,
            });
            return res.status(201).json({ schedule });
        }
        catch (e) {
            if (typeof e.message === "string" &&
                (e.message.includes("동아리의 멤버만") ||
                    e.message.includes("WRITER") ||
                    e.message.includes("LEADER"))) {
                return res.status(403).json({ message: e.message });
            }
            return res
                .status(400)
                .json({ message: e.message ?? "일정 생성 중 오류가 발생했습니다." });
        }
    }
    // 일정 수정
    static async update(req, res) {
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
            const parsed = parseBody(updateScheduleSchema, req.body);
            const patchData = {};
            if (parsed.title !== undefined)
                patchData.title = parsed.title;
            if (parsed.content !== undefined)
                patchData.content = parsed.content;
            if (parsed.startAt)
                patchData.startAt = new Date(parsed.startAt);
            if (parsed.endAt)
                patchData.endAt = new Date(parsed.endAt);
            const updated = await ScheduleService.updateSchedule(scheduleId, req.user.userId, patchData);
            if (updated.clubId !== clubId) {
                return res
                    .status(400)
                    .json({ message: "해당 동아리의 일정이 아닙니다." });
            }
            return res.json({ schedule: updated });
        }
        catch (e) {
            if (typeof e.message === "string" &&
                (e.message.includes("동아리의 멤버만") ||
                    e.message.includes("리더") ||
                    e.message.includes("작성자"))) {
                return res.status(403).json({ message: e.message });
            }
            return res
                .status(400)
                .json({ message: e.message ?? "일정 수정 중 오류가 발생했습니다." });
        }
    }
    /**
     * DELETE /api/clubs/:clubId/schedules/:scheduleId
     */
    static async delete(req, res) {
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
        }
        catch (e) {
            if (typeof e.message === "string" &&
                (e.message.includes("동아리의 멤버만") ||
                    e.message.includes("리더 또는 작성자만"))) {
                return res.status(403).json({ message: e.message });
            }
            console.error(e);
            return res
                .status(400)
                .json({ message: e.message ?? "일정 삭제 중 오류가 발생했습니다." });
        }
    }
}
