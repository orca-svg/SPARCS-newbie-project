import { z } from "zod";
export const registerSchema = z.object({
    name: z.string().min(1, "이름은 필수입니다."),
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: z
        .string()
        .min(8, "비밀번호는 8자 이상이어야 합니다."),
});
export const loginSchema = z.object({
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: z.string().min(1, "비밀번호는 필수입니다."),
});
export const createClubSchema = z.object({
    name: z.string().min(1, "동아리 이름은 필수입니다.").max(50),
    description: z
        .string()
        .max(200, "설명은 200자 이하여야 합니다.")
        .optional()
        .nullable(),
});
export const createScheduleSchema = z.object({
    title: z.string().min(1, "일정 제목은 필수입니다.").max(100),
    startAt: z.string().datetime("시작 일시는 ISO 문자열이어야 합니다."),
    endAt: z.string().datetime("종료 일시는 ISO 문자열이어야 합니다."),
    content: z.string().max(500).optional().nullable(),
});
export const updateScheduleSchema = createScheduleSchema.partial();
export const updateMemberRoleTierSchema = z.object({
    role: z.enum(["LEADER", "WRITER", "READER"]).optional(),
    tier: z.enum(["JUNIOR", "SENIOR", "MANAGER"]).optional(),
});
