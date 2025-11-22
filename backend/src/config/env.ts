import "dotenv/config";

export const config = {
  port: process.env.PORT ?? 4000,
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  dbUrl: process.env.DATABASE_URL ?? ""
};
