import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
export const generateToken = (payload) => {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
};
export const verifyToken = (token) => {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded;
};
