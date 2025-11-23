import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.ts";
import type { AuthRequest } from "../middleware/auth.ts";

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "필수 값이 누락되었습니다." });
      }

      const user = await AuthService.register({ email, password, name });

      return res.status(201).json({
        message: "회원가입이 완료되었습니다.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (e: any) {
      return res.status(400).json({ message: e.message ?? "회원가입 실패" });
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "이메일과 비밀번호가 필요합니다." });
      }

      const { user, token } = await AuthService.login({ email, password });

      return res.json({
        message: "로그인 성공",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (e: any) {
      return res.status(401).json({ message: e.message ?? "로그인 실패" });
    }
  }

  // GET /api/auth/me
  static async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "인증이 필요합니다." });
      }

      const me = await AuthService.getMe(req.user.userId);

      return res.json({ user: me });
    } catch (e: any) {
      return res.status(400).json({
        message: e.message ?? "내 정보 조회에 실패했습니다.",
      });
    }
  }
}
