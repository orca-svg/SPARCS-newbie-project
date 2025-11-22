import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.ts";

export interface AuthRequest extends Request {
  user?: { id: number };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
