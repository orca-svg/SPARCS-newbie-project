import type { Request } from "express";
import type { UserRole } from "@prisma/client";

export interface AuthUserPayload {
  userId: number;
  role: UserRole; // 'USER' | 'ADMIN'
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}
