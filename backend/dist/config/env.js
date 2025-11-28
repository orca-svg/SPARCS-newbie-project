import "dotenv/config";
export const config = {
    env: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 4000),
    dbUrl: process.env.DATABASE_URL ?? "",
    maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10),
    jwtSecret: process.env.JWT_SECRET ?? "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    cookieName: process.env.COOKIE_NAME ?? "auth",
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(","),
    awsRegion: process.env.AWS_REGION ?? "",
    awsBucket: process.env.AWS_S3_BUCKET ?? "",
    awsAccessKey: process.env.AWS_ACCESS_KEY_ID ?? "",
    awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    awsCloudfrontUrl: process.env.AWS_CLOUDFRONT_URL ?? "",
};
