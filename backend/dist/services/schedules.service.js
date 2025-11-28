import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import ClubService from "./clubs.service.js";
export default class ScheduleService {
    static async listByClub(clubId, userId, options = {}) {
        await ClubService.ensureApprovedMember(userId, clubId);
        const { from, to, limit } = options;
        const where = {
            clubId,
        };
        // [from, to] 기간과 겹치는 일정만 가져오기
        if (from || to) {
            const andConditions = [];
            if (from) {
                andConditions.push({
                    endAt: { gte: from }, // 종료일이 from 이후
                });
            }
            if (to) {
                andConditions.push({
                    startAt: { lte: to }, // 시작일이 to 이전
                });
            }
            if (andConditions.length > 0) {
                where.AND = andConditions;
            }
        }
        const schedules = await prisma.schedule.findMany({
            where,
            orderBy: { startAt: "asc" },
            take: limit ?? undefined,
        });
        return schedules.map((s) => ({
            id: s.id,
            clubId: s.clubId,
            title: s.title,
            startAt: s.startAt,
            endAt: s.endAt,
            content: s.content ?? null,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
        }));
    }
    static async createSchedule(clubId, userId, data) {
        // 승인 멤버 여부 확인
        await ClubService.ensureApprovedMember(userId, clubId);
        // 🔹 권한 체크: LEADER 또는 WRITER만 허용
        const membership = await prisma.clubMember.findFirst({
            where: {
                clubId,
                userId,
                approved: true,
            },
            select: { role: true },
        });
        if (!membership) {
            throw new Error("동아리의 승인된 멤버만 일정 생성이 가능합니다.");
        }
        if (membership.role !== "LEADER" && membership.role !== "WRITER") {
            throw new Error("동아리 일정은 WRITER 또는 LEADER만 생성할 수 있습니다.");
        }
        const created = await prisma.schedule.create({
            data: {
                clubId,
                title: data.title,
                startAt: data.startAt,
                endAt: data.endAt,
                content: data.content ?? null,
            },
        });
        return {
            id: created.id,
            clubId: created.clubId,
            title: created.title,
            startAt: created.startAt,
            endAt: created.endAt,
            content: created.content ?? null,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
        };
    }
    // 🔹 writer/leader 권한 공통 체크
    static async ensureWriterOrLeader(userId, clubId) {
        await ClubService.ensureApprovedMember(userId, clubId);
        const member = await prisma.clubMember.findFirst({
            where: {
                userId,
                clubId,
                approved: true,
            },
        });
        if (!member) {
            throw new Error("동아리의 멤버만 일정을 수정할 수 있습니다.");
        }
        if (member.role !== "LEADER" && member.role !== "WRITER") {
            throw new Error("리더 또는 작성자만 일정을 수정/삭제할 수 있습니다.");
        }
        return member;
    }
    // 🔹 일정 수정
    static async updateSchedule(scheduleId, userId, data) {
        const existing = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });
        if (!existing) {
            throw new Error("일정을 찾을 수 없습니다.");
        }
        // 권한 체크 (해당 일정이 속한 club 기준)
        await this.ensureWriterOrLeader(userId, existing.clubId);
        // 날짜 유효성 검사
        if (data.startAt && data.endAt && data.endAt < data.startAt) {
            throw new Error("종료일은 시작일 이후여야 합니다.");
        }
        const updated = await prisma.schedule.update({
            where: { id: scheduleId },
            data,
        });
        return {
            id: updated.id,
            clubId: updated.clubId,
            title: updated.title,
            startAt: updated.startAt,
            endAt: updated.endAt,
            content: updated.content ?? null,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }
    // 🔹 일정 삭제
    static async deleteSchedule(scheduleId, userId) {
        const existing = await prisma.schedule.findUnique({
            where: { id: scheduleId },
        });
        if (!existing) {
            throw new Error("존재하지 않는 일정입니다.");
        }
        // writer/leader 권한 체크
        await this.ensureWriterOrLeader(userId, existing.clubId);
        await prisma.schedule.delete({
            where: { id: scheduleId },
        });
    }
}
