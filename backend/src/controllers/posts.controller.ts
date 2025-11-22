import type { Request, Response } from "express";
import * as postsService from "../services/posts.service.ts";

export const getPosts = async (req: Request, res: Response) => {
  const posts = await postsService.getAllPosts();
  res.json(posts);
};
