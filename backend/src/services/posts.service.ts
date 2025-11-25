import { prisma } from "../prisma/client.ts";

import type {
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
  isNotice: boolean;
}

// 정렬 옵션 타입
export type PostListSort = "latest" | "oldest" | "mostViewed";

export interface PostListOptions {
  page: number;      // 1부터 시작
  pageSize: number;  // 한 페이지당 개수
  sort: PostListSort;
  query?: string;    // 검색어(제목/내용)
  onlyNotice?: boolean;
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
  isNotice: boolean;
  author: {
    id: number;
    name: string;
    tier: MemberTier | null;
    role: ClubMemberRole | null;
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

  private static async getClubMember(userId: number, clubId: number) {
  const member = await prisma.clubMember.findFirst({
    where: { userId, clubId },
  });

  if (!member) {
    throw new Error("해당 동아리의 멤버만 접근할 수 있습니다.");
  }
  return member;
}

private static canSetNotice(role: ClubMemberRole, tier: MemberTier | null) {
  // 요구사항: role === MANAGER 이거나 tier가 SENIOR 또는 LEADER
  return (
    tier === "MANAGER" ||
    tier === "SENIOR" ||
    role === "LEADER"
  );
}

  // clubId 기준으로 게시글 목록 (멤버만)
  static async listByClub(
  clubId: number,
  userId: number,
  options?: Partial<PostListOptions>,
): Promise<{
  items: PostListItem[];
  pagination: {
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
}> {
  // 1) 동아리 멤버인지 확인 (기존 함수 그대로 사용)
  await this.ensureClubMember(userId, clubId);

  // 2) 페이지/사이즈/정렬/검색어 기본값 처리
  const page = Math.max(options?.page ?? 1, 1);
  const pageSizeRaw = options?.pageSize ?? 10;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 50);

  const sort: PostListSort = (options?.sort as PostListSort) ?? "latest";
  const q = options?.query?.trim();
  const onlyNotice = options?.onlyNotice ?? false;

  // 3) where 조건 (검색어 있으면 제목/내용 OR)
  const where: import("@prisma/client").Prisma.PostWhereInput = {
    clubId,
    OR: q
      ? [
          {
            title: {
              contains: q,
            },
          },
          {
            content: {
              contains: q,
            },
          },
        ]
      : undefined,
  };

  // 4) 정렬 조건
  const orderBy: import("@prisma/client").Prisma.PostOrderByWithRelationInput[] = [];

  if (!onlyNotice) {
    orderBy.push({ isNotice: "desc" });
  }

  if (sort === "oldest") {
    orderBy.push({ createdAt: "asc" });
  } else if (sort === "mostViewed") {
    orderBy.push({ viewCount: "desc" }, { createdAt: "desc" });
  } else {
    orderBy.push({ createdAt: "desc" }); // latest
  }

  // 5) count + 목록을 함께 조회
  const [totalCount, posts] = await prisma.$transaction([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  // 6) PostListItem[] 로 매핑
  const items: PostListItem[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    viewCount: p.viewCount,
    authorName: p.user.name,
    authorTier: p.authorTier ?? null,
    visibility: p.visibility,
    commentCount: p._count.comments,
    isNotice: p.isNotice,
  }));

  return {
    items,
    pagination: {
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    },
  };
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
      isNotice: updated.isNotice,
      author: {
        id: updated.user.id,
        name: updated.user.name,
        tier: updated.authorTier ?? null,
        role: updated.authorRole ?? null
      },
    };
  }

  // 새 글 작성 (동아리 멤버라면 누구나 작성 허용 / 나중에 role에 따라 제한 가능)
  static async createPost(
  clubId: number,
  userId: number,
  data: {
    title: string;
    content: string;
    visibility: PostVisibility;
    isNotice?: boolean;
  },
) {
  await this.ensureClubMember(userId, clubId);

  const member = await this.getClubMember(userId, clubId);

  const wantNotice = !!data.isNotice;
  if (wantNotice && !this.canSetNotice(member.role, member.tier)) {
    throw new Error("공지로 설정할 권한이 없습니다.");
  }

  const post = await prisma.post.create({
    data: {
      clubId,
      userId,
      title: data.title,
      content: data.content,
      visibility: data.visibility,
      authorTier: member.tier,
      isNotice: wantNotice,   // 공지 여부
    },
  });

  return post;
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

  
  // 게시글 수정 (작성자 본인만)
   static async updatePost(
  postId: number,
  userId: number,
  clubId: number,
  data: {
    title?: string;
    content?: string;
    visibility?: PostVisibility;
    isNotice?: boolean;
  },
) {
  await this.ensureClubMember(userId, clubId);

  const existing = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!existing) {
    throw new Error("존재하지 않는 게시글입니다.");
  }

  if (existing.clubId !== clubId) {
    throw new Error("해당 동아리의 게시글이 아닙니다.");
  }

  const member = await this.getClubMember(userId, clubId);

  // 공지 여부를 변경하려는 경우 권한 확인
  if (
    typeof data.isNotice === "boolean" &&
    data.isNotice !== existing.isNotice &&
    !this.canSetNotice(member.role, member.tier)
  ) {
    throw new Error("공지 설정을 변경할 권한이 없습니다.");
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      title: data.title ?? existing.title,
      content: data.content ?? existing.content,
      visibility: data.visibility ?? existing.visibility,
      isNotice:
        typeof data.isNotice === "boolean"
          ? data.isNotice
          : existing.isNotice,
    },
  });

  return await this.getPost(postId, userId);
}
    // 게시글 삭제 (작성자 본인만)
  static async deletePost(input: {
    postId: number;
    clubId: number;
    userId: number;
  }) {
    const { postId, clubId, userId } = input;

    await this.ensureClubMember(userId, clubId);

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.clubId !== clubId) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    if (post.userId !== userId) {
      throw new Error("게시글을 삭제할 권한이 없습니다.");
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return { message: "게시글이 삭제되었습니다." };
  }
}

export default PostService;
