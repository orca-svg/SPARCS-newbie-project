import { Router } from "express";
import postsRouter from "./posts.route.ts";

const router = Router();

router.use("/posts", postsRouter);

export default router;
