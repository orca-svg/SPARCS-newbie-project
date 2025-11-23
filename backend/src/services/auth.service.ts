import { prisma } from "../prisma/client.ts";
import { hashPassword, comparePassword } from "../utils/bcrypt.ts";
import { generateToken } from "../utils/jwt.ts";
import type { User, UserRole } from "@prisma/client";

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  // 회원가입
  static async register(input: RegisterInput): Promise<User> {
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
        role: "USER", // UserRole enum과 일치
      },
    });

    return user;
  }

  // 로그인
  static async login(input: LoginInput): Promise<{
    user: User;
    token: string;
  }> {
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
      role: user.role as UserRole,
    });

    return { user, token };
  }

  // 나중에 "내 정보" 조회용
  static async getMe(userId: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
