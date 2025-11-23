import { Router } from "express";
import postsRouter from "./posts.route.ts";
import authRouter from "./auth.route.ts";
import clubsRouter from "./clubs.route.ts";


const router = Router();

router.use("/posts", postsRouter);
router.use("/auth", authRouter);
router.use("/clubs", clubsRouter);


export default router;
