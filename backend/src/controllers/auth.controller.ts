import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { parseBody } from "../validation/parse.ts";
import { registerSchema, loginSchema } from "../validation/schemas.ts";

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response) {
    try {
      const data = parseBody(registerSchema, req.body);

      const user = await AuthService.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      return res.status(201).json({ user });
    } catch (e: any) {
      return res.status(400).json({
        message: e.message ?? "회원가입에 실패했습니다.",
      });
    }
  }

  // POST /api/auth/login
static async login(req: Request, res: Response) {
    try {
      const data = parseBody(loginSchema, req.body);

      const { token, user } = await AuthService.login({
        email: data.email,
        password: data.password,
      });

      return res.json({ token, user });
    } catch (e: any) {
      return res.status(400).json({
        message: e.message ?? "로그인에 실패했습니다.",
      });
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
