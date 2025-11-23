import jwt from "jsonwebtoken";
import { config } from "../config/env.ts";
import type { UserRole } from "@prisma/client";

export interface JwtPayload {
  userId: number;
  role: UserRole;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtSecret);
  return decoded as JwtPayload;
};
