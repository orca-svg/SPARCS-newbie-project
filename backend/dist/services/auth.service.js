import { prisma } from "../prisma/client.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { generateToken } from "../utils/jwt.js";
export class AuthService {
    // 회원가입
    static async register(input) {
        const { email, password, name } = input;
        const existing = await prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            throw new Error("이미 사용 중인 이메일입니다.");
        }
        const hashed = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashed,
                name,
                role: "USER", // UserRole
            },
        });
        return user;
    }
    // 로그인
    static async login(input) {
        const { email, password } = input;
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        const ok = await comparePassword(password, user.password);
        if (!ok) {
            throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        const token = generateToken({
            userId: user.id,
            role: user.role,
        });
        return { user, token };
    }
    // 나중에 "내 정보" 조회용
    static async getMe(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new Error("사용자를 찾을 수 없습니다.");
        }
        return user;
    }
}
