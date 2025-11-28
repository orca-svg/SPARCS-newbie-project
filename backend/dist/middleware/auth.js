import { verifyToken } from "../utils/jwt.js";
// Authorization: Bearer <token>
export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "토큰이 없습니다." });
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "올바르지 않은 토큰 형식입니다." });
    }
    try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
    }
};
