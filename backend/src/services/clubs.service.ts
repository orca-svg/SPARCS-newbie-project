import { prisma } from "../prisma/client.ts";
import type { Club } from "@prisma/client";

export class ClubService {
  // 전체 동아리 목록
  static async listAll(): Promise<Club[]> {
    return prisma.club.findMany({
      orderBy: { name: "asc" },
    });
  }

  // 내가 가입한 동아리 목록 (ONLY approved)
  static async listMy(userId: number): Promise<Club[]> {
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

    // clubMember[] → club[] 로 변환
    return memberships.map((m) => m.club);
  }
  static async getById(id: number): Promise<Club | null> {
    return prisma.club.findUnique({
      where: { id },
    });
  }
}

export default ClubService;
