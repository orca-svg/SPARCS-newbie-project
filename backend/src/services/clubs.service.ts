import { prisma } from "../prisma/client.ts";
import type { Club, UserRole } from "@prisma/client";
import { ClubMemberRole } from "@prisma/client";

export interface ClubMemberDTO {
  id: number;
  userId: number;
  name: string;
  email: string | null;
  role: "LEADER" | "WRITER" | "READER";
  tier: "JUNIOR" | "SENIOR" | "MANAGER";
  joinedAt: Date;
}

export class ClubService {
  // 1) 전체 동아리 목록
  static async listAll(): Promise<Club[]> {
    return prisma.club.findMany({
      orderBy: { name: "asc" },
    });
  }

  // 2) 내가 가입한 동아리 목록 (approved = true 인 것만)
  static async listMy(
    userId: number,
  ): Promise<
    {
      id: number;
      name: string;
      description: string | null;
      role: "LEADER" | "WRITER" | "READER";
      tier: "JUNIOR" | "SENIOR" | "MANAGER";
    }[]
  > {
    const memberships = await prisma.clubMember.findMany({
      where: {
        userId,
        approved: true,
      },
      include: {
        club: true,
      },
      orderBy: {
        club: {
          name: "asc",
        },
      },
    });

    // club 정보에 role/tier를 얹어서 반환
    return memberships.map((m) => ({
      id: m.club.id,
      name: m.club.name,
      description: m.club.description,
      role: m.role,
      tier: m.tier,
    }));
  }

    // 3) 특정 동아리 정보
    static async getById(id: number): Promise<Club | null> {
      return prisma.club.findUnique({
        where: { id },
      });
    }
    static async ensureApprovedMember(userId: number, clubId: number) {
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

  // 0) 내부 helper: 리더 또는 ADMIN 인지 확인
  private static async ensureClubLeaderOrAdmin(
    clubId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    // 시스템 ADMIN 이면 바로 통과
    if (userRole === "ADMIN") return;

    const leader = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId,
        role: "LEADER",
        approved: true,
      },
    });

    if (!leader) {
      throw new Error("해당 동아리의 리더가 아닙니다.");
    }
  }

  // 4) 동아리 가입 신청
  static async requestJoin(clubId: number, userId: number) {
    // 동아리 존재 여부 체크
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new Error("존재하지 않는 동아리입니다.");
    }

    // userId + clubId 조합으로 기존 membership 확인
    const existing = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });

    if (existing) {
      if (!existing.approved) {
        throw new Error("이미 가입 신청을 했습니다.");
      }
      throw new Error("이미 가입된 동아리입니다.");
    }

    const newRequest = await prisma.clubMember.create({
      data: {
        userId,
        clubId,
        approved: false,
        role: "READER",
        tier: "JUNIOR",
      },
    });

    return { message: "가입 신청 완료", request: newRequest };
  }

  // 5) 가입 요청 목록 조회 (리더/ADMIN 전용)
  static async listJoinRequests(
    clubId: number,
    requesterId: number,
    requesterRole: UserRole,
  ) {
    await this.ensureClubLeaderOrAdmin(clubId, requesterId, requesterRole);

    const pendingMembers = await prisma.clubMember.findMany({
      where: {
        clubId,
        approved: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return pendingMembers;
  }

  // 6) 가입 승인
  static async approveMember(
    clubId: number,
    memberId: number,
    requesterId: number,
    requesterRole: UserRole,
  ) {
    await this.ensureClubLeaderOrAdmin(clubId, requesterId, requesterRole);

    const member = await prisma.clubMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.clubId !== clubId) {
      throw new Error("해당 멤버를 찾을 수 없습니다.");
    }

    if (member.approved) {
      throw new Error("이미 승인된 멤버입니다.");
    }

    const updated = await prisma.clubMember.update({
      where: { id: memberId },
      data: { approved: true },
    });

    return updated;
  }

  // 7) 가입 거절 (대기 상태 삭제)
  static async rejectMember(
    clubId: number,
    memberId: number,
    requesterId: number,
    requesterRole: UserRole,
  ) {
    await this.ensureClubLeaderOrAdmin(clubId, requesterId, requesterRole);

    const member = await prisma.clubMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.clubId !== clubId) {
      throw new Error("해당 멤버를 찾을 수 없습니다.");
    }

    if (member.approved) {
      throw new Error("이미 승인된 멤버는 거절할 수 없습니다.");
    }

    await prisma.clubMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }
static async createClub(input: { // 동아리 생성 -> 최초 생성 시 생성자가 리더로 자동 가입 
  name: string;
  description?: string | null;
  creatorUserId: number;
}): Promise<Club> {
  const { name, description, creatorUserId } = input;

  const club = await prisma.club.create({
    data: {
      name,
      description: description ?? null,
      members: {
        create: {
          userId: creatorUserId,
          approved: true,
          role: "LEADER",
          tier: "MANAGER",
        },
      },
    },
  });

    return club;
  }
  static async ensureWriterOrLeader(userId: number, clubId: number) {
    const membership = await prisma.clubMember.findFirst({
      where: { userId, clubId, approved: true },
    });

    if (!membership) {
      throw new Error("동아리의 멤버만 사용할 수 있습니다.");
    }

    if (
      membership.role !== ClubMemberRole.LEADER &&
      membership.role !== ClubMemberRole.WRITER
    ) {
      throw new Error("일정 수정/삭제는 리더 또는 작성자만 가능합니다.");
    }

    return membership;
  }

  static async listMembers(
    clubId: number,
    requesterId: number,
  ): Promise<ClubMemberDTO[]> {
    // 조회하려는 사람도 승인된 멤버여야 보이도록
    await this.ensureApprovedMember(requesterId, clubId);

    const members = await prisma.clubMember.findMany({
      where: {
        clubId,
        approved: true,
      },
      orderBy: [
        { role: "asc" },      // (원하면 커스텀 정렬로 바꿔도 됨)
        { createdAt: "asc" },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.name ?? "이름 없음",
      email: m.user?.email ?? null,
      role: m.role,
      tier: m.tier,
      joinedAt: m.createdAt,
    }));
  }
}

export default ClubService;
