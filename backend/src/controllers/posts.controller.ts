import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.ts";
import PostService from "../services/posts.service.ts";

export class PostController {
  // GET /api/clubs/:clubId/posts
  static async listByClub(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      if (Number.isNaN(clubId)) {
        return res.status(400).json({ message: "유효하지 않은 clubId입니다." });
      }

      const posts = await PostService.listByClub(clubId, req.user.userId);
      return res.json({ posts });
    } catch (e: any) {
      return res
        .status(400)
        .json({ message: e.message ?? "게시글 목록을 가져오지 못했습니다." });
    }
  }

  // GET /api/posts/:postId
  static async getOne(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const postId = Number(req.params.postId);
      if (Number.isNaN(postId)) {
        return res.status(400).json({ message: "유효하지 않은 postId입니다." });
      }

      const post = await PostService.getPost(postId, req.user.userId);
      return res.json({ post });
    } catch (e: any) {
      return res
        .status(400)
        .json({ message: e.message ?? "게시글을 가져오지 못했습니다." });
    }
  }

  // POST /api/clubs/:clubId/posts
  static async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const clubId = Number(req.params.clubId);
      if (Number.isNaN(clubId)) {
        return res.status(400).json({ message: "유효하지 않은 clubId입니다." });
      }

      const { title, content, visibility } = req.body ?? {};

      if (!title || !content) {
        return res
          .status(400)
          .json({ message: "title과 content는 필수입니다." });
      }

      const post = await PostService.createPost({
        clubId,
        userId: req.user.userId,
        title,
        content,
        visibility,
      });

      return res.status(201).json({ post });
    } catch (e: any) {
      return res
        .status(400)
        .json({ message: e.message ?? "게시글 생성에 실패했습니다." });
    }
  }

  // GET /api/posts/:postId/comments
  static async listComments(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const postId = Number(req.params.postId);
      if (Number.isNaN(postId)) {
        return res.status(400).json({ message: "유효하지 않은 postId입니다." });
      }

      const comments = await PostService.listComments(
        postId,
        req.user.userId,
      );
      return res.json({ comments });
    } catch (e: any) {
      return res
        .status(400)
        .json({ message: e.message ?? "댓글 목록을 가져오지 못했습니다." });
    }
  }

  // POST /api/posts/:postId/comments
  static async createComment(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
      }

      const postId = Number(req.params.postId);
      if (Number.isNaN(postId)) {
        return res.status(400).json({ message: "유효하지 않은 postId입니다." });
      }

      const { content } = req.body ?? {};
      if (!content) {
        return res.status(400).json({ message: "content는 필수입니다." });
      }

      const comment = await PostService.createComment({
        postId,
        userId: req.user.userId,
        content,
      });

      return res.status(201).json({ comment });
    } catch (e: any) {
      return res
        .status(400)
        .json({ message: e.message ?? "댓글 작성에 실패했습니다." });
    }
  }
}

export default PostController;
