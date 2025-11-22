import jwt from "jsonwebtoken";
import { config } from "../config/env.ts";

export interface JwtPayload {
  userId: number;
}

export const signToken = (payload: JwtPayload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};
