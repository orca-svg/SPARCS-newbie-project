import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { PostController } from "../controllers/posts.controller.js";
const router = Router();
// 클럽별 게시글 목록/작성
router.get("/clubs/:clubId/posts", authMiddleware, PostController.listByClub);
router.post("/clubs/:clubId/posts", authMiddleware, PostController.create);
// 단일 게시글 + 댓글
router.get("/posts/:postId", authMiddleware, PostController.getOne);
router.get("/posts/:postId/comments", authMiddleware, PostController.listComments);
router.post("/posts/:postId/comments", authMiddleware, PostController.createComment);
//동아리별 게시글 상세 다른 방법 (프론트에서 호출하는 라우트)
router.get("/clubs/:clubId/posts/:postId", authMiddleware, PostController.getOne);
router.put("/clubs/:clubId/posts/:postId", authMiddleware, PostController.update);
router.delete("/clubs/:clubId/posts/:postId", authMiddleware, PostController.remove);
export default router;
