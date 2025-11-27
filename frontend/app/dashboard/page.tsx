"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type Role = "LEADER" | "WRITER" | "READER";
type Tier = "JUNIOR" | "SENIOR" | "MANAGER";

interface MyClub {
  id: number;
  name: string;
  description: string | null;
  role: Role;
  tier: Tier;
}

interface ScheduleDTO {
  id: number;
  clubId: number;
  title: string;
  startAt: string;
  endAt: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RecentPost {
  id: number;
  title: string;
  createdAt: string;
  commentCount: number;
  viewCount: number;
  isNotice?: boolean;
}

// clubId별 요약 데이터
interface ClubSummary {
  schedules: ScheduleDTO[];
  notices: RecentPost[];
}

function formatYMD(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth({ required: true });

  const [myClubs, setMyClubs] = useState<MyClub[]>([]);
  const [summaries, setSummaries] = useState<Record<number, ClubSummary>>({});
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1) 내가 가입한 동아리 목록
  const loadMyClubs = async () => {
    try {
      const res = await authApiRequest<{ clubs: MyClub[] }>("/clubs/my");
      setMyClubs(res.clubs ?? []);
    } catch (e: any) {
      setErrorMsg(e.message ?? "내 동아리 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 2) 각 동아리별 일정 3개 + 공지 3개
  const loadSummaries = async (clubs: MyClub[]) => {
    if (clubs.length === 0) return;

    setSummaryLoading(true);
    setErrorMsg(null);

    try {
      // 오늘 ~ 30일 후 범위
      const today = new Date();
      const from = formatYMD(today);
      const toDate = new Date();
      toDate.setDate(today.getDate() + 30);
      const to = formatYMD(toDate);

      const basePostsQuery = "page=1&pageSize=3&sort=latest&onlyNotice=true";

      const results = await Promise.all(
        clubs.map(async (club) => {
          const [scheduleRes, postsRes] = await Promise.all([
            authApiRequest<{ schedules: ScheduleDTO[] }>(
              `/clubs/${club.id}/schedules?from=${from}&to=${to}&limit=3`,
            ),
            authApiRequest<{ posts: RecentPost[] }>(
              `/clubs/${club.id}/posts?${basePostsQuery}`,
          ),
          ]);

          const notices = (postsRes.posts ?? []).filter(
            (p) => p.isNotice === true,
          );

          return {
            clubId: club.id,
            schedules: scheduleRes.schedules ?? [],
            notices: notices.slice(0, 3),
          };
        }),
      );

      const map: Record<number, ClubSummary> = {};
      results.forEach((r) => {
        map[r.clubId] = {
          schedules: r.schedules,
          notices: r.notices,
        };
      });

      setSummaries(map);
    } catch (e: any) {
      setErrorMsg(e.message ?? "대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadMyClubs();
  }, []);

  useEffect(() => {
    if (myClubs.length > 0) {
      loadSummaries(myClubs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myClubs]);

  if (loading) {
    return (
      <div className="dashboard-main" style={{ padding: 24 }}>
        데이터를 불러오는 중...
      </div>
    );
  }

  // 동아리가 하나도 없는 경우
  if (!loading && myClubs.length === 0) {
    return (
      <div className="dashboard-main" style={{ padding: 24 }}>
        <h1 className="page-title">대시보드</h1>
        <p style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>
          동아리를 가입해보세요!
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/clubs")}
          style={{
            marginTop: 12,
            padding: "8px 16px",
            borderRadius: 999,
            background: "#0f172a",
            color: "white",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          동아리 가입하기
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      <h1 className="page-title">대시보드</h1>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
        {user?.name ?? "사용자"} 님이 가입한 동아리들의
        다가오는 일정과 공지를 한눈에 볼 수 있습니다.
      </p>

      {errorMsg && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#ef4444" }}>
          {errorMsg}
        </div>
      )}

      {summaryLoading && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
          요약 데이터를 불러오는 중...
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {myClubs.map((club) => {
          const summary = summaries[club.id] ?? {
            schedules: [],
            notices: [],
          };

          return (
            <div
              key={club.id}
              style={{
                background: "#fdfbf5",
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* 동아리 이름 */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {club.name}
              </div>
              {club.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 8,
                  }}
                >
                  {club.description}
                </div>
              )}

              {/* 일정 3개 */}
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  📅 다가오는 일정
                </div>

                {summary.schedules.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    예정된 일정이 없습니다.
                  </div>
                )}

                {summary.schedules.map((sch) => (
                  <div
                    key={sch.id}
                    style={{
                      fontSize: 12,
                      marginBottom: 4,
                      color: "#4b5563",
                    }}
                  >
                    • {sch.title}{" "}
                    <span style={{ color: "#9ca3af" }}>
                      ({new Date(sch.startAt).toLocaleDateString()})
                    </span>
                  </div>
                ))}
              </div>

              {/* 공지 3개 */}
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  📢 최근 공지
                </div>

                {summary.notices.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    등록된 공지가 없습니다.
                  </div>
                )}

                {summary.notices.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      fontSize: 12,
                      marginBottom: 4,
                      color: "#4b5563",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      router.push(
                        `/dashboard/clubs/${club.id}/posts/${n.id}`,
                      )
                    }
                  >
                    • {n.title}{" "}
                    <span style={{ color: "#9ca3af" }}>
                      ({new Date(n.createdAt).toLocaleDateString()})
                    </span>
                  </div>
                ))}
              </div>

              {/* 상세 이동 버튼 */}
              <button
                type="button"
                onClick={() => router.push(`/dashboard/clubs/${club.id}`)}
                style={{
                  marginTop: "auto",
                  marginLeft: "auto",
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "#0f172a",
                  color: "white",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                상세 보기 →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
