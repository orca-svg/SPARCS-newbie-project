import { Router } from "express";
import { authMiddleware } from "../middleware/auth.ts";
import { PostController } from "../controllers/posts.controller.ts";

const router = Router();

// 클럽별 게시글 목록/작성
router.get(
  "/clubs/:clubId/posts",
  authMiddleware,
  PostController.listByClub,
);
router.post(
  "/clubs/:clubId/posts",
  authMiddleware,
  PostController.create,
);

// 단일 게시글 + 댓글
router.get("/posts/:postId", authMiddleware, PostController.getOne);
router.get(
  "/posts/:postId/comments",
  authMiddleware,
  PostController.listComments,
);
router.post(
  "/posts/:postId/comments",
  authMiddleware,
  PostController.createComment,
);

export default router;
