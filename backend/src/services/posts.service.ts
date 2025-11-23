import { prisma } from "../prisma/client.ts";
import type {
  Post,
  PostVisibility,
  MemberTier,
  ClubMemberRole,
} from "@prisma/client";

export interface PostListItem {
  id: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  authorName: string;
  authorTier: MemberTier | null;
  visibility: PostVisibility;
  commentCount: number;
}

export interface PostDetail {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  visibility: PostVisibility;
  clubId: number;
  author: {
    id: number;
    name: string;
    tier: MemberTier | null;
  };
}

/* 동아리 게시글 + 댓글 관련 서비스*/
export class PostService {
  // 내부: 해당 동아리에 가입한 멤버인지(approved) 확인
  private static async ensureClubMember(userId: number, clubId: number) {
    const membership = await prisma.clubMember.findUnique({
      where: {
        userId_clubId: { userId, clubId },
      },
    });

    if (!membership || !membership.approved) {
      throw new Error("해당 동아리의 멤버만 접근할 수 있습니다.");
    }

    return membership;
  }

  // clubId 기준으로 게시글 목록 (멤버만)
  static async listByClub(
    clubId: number,
    userId: number,
  ): Promise<PostListItem[]> {
    await this.ensureClubMember(userId, clubId);

    const posts = await prisma.post.findMany({
      where: { clubId },
      include: {
        user: { select: { id: true, name: true } },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      viewCount: p.viewCount,
      authorName: p.user.name,
      authorTier: p.authorTier ?? null,
      visibility: p.visibility,
      commentCount: p._count.comments,
    }));
  }

  // 단일 게시글 상세 조회 + 조회수 증가 (멤버만)
  static async getPost(postId: number, userId: number): Promise<PostDetail> {
  // 1) 해당 게시글 존재 여부 확인 + clubId 가져오기
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new Error("게시글을 찾을 수 없습니다.");
  }

  // 2) 이 게시글이 속한 클럽의 멤버인지 확인
  await this.ensureClubMember(userId, post.clubId);

  // 3) 조회수 1 증가 + 작성자 정보 포함해서 다시 가져오기
  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      viewCount: {
        increment: 1,
      },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      viewCount: updated.viewCount,
      visibility: updated.visibility,
      clubId: updated.clubId,
      author: {
        id: updated.user.id,
        name: updated.user.name,
        tier: updated.authorTier ?? null,
      },
    };
  }

  // 새 글 작성 (동아리 멤버라면 누구나 작성 허용 / 나중에 role에 따라 제한 가능)
  static async createPost(input: {
  clubId: number;
  userId: number;
  title: string;
  content: string;
  visibility?: PostVisibility;
}) {
  const { clubId, userId, title, content, visibility } = input;

  // 멤버쉽 정보 가져오기 (tier 포함)
  const membership = await this.ensureClubMember(userId, clubId);

  return prisma.post.create({
    data: {
      clubId,
      userId,
      title,
      content,
      visibility: visibility ?? "ALL",
      authorTier: membership.tier,
    },
  });
}

  // 댓글 목록 (멤버만)
  static async listComments(postId: number, userId: number) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    await this.ensureClubMember(userId, post.clubId);

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return comments;
  }

  // 댓글 생성 (해당 클럽 멤버라면 누구나 작성 가능)
  static async createComment(input: {
    postId: number;
    userId: number;
    content: string;
  }) {
    const { postId, userId, content } = input;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    await this.ensureClubMember(userId, post.clubId);

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return comment;
  }
}

export default PostService;
