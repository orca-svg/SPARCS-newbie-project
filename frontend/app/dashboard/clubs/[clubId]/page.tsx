"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface ClubDetail {
  id: number;
  name: string;
  description: string | null;
  createdAt?: string;
}

interface MyClub {
  id: number;
  name: string;
  description: string | null;
  role: "LEADER" | "WRITER" | "READER";
  tier: "JUNIOR" | "SENIOR" | "MANAGER";
}

interface RecentPost {
  id: number;
  title: string;
  createdAt: string;
  commentCount: number;
  viewCount: number;
  isNotice?: boolean;
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

interface ClubMemberSummary {
  id: number;
  userId: number;
  name: string;
  role: "LEADER" | "WRITER" | "READER";
  tier: "JUNIOR" | "SENIOR" | "MANAGER";
  joinedAt: string;
}


type JoinStatus = "unknown" | "joined" | "not-joined";
type ClubMemberRole = "LEADER" | "WRITER" | "READER";

function formatYMD(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function sameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

/** =======================
 *  캘린더 컴포넌트
 *  - drag & drop으로 날짜 변경
 *  - hover 시 삭제 버튼 노출
 *  - 변경/삭제 후 onChanged() 호출하여 우측 패널 갱신
 * ======================== */
function ClubScheduleCalendar({
  clubId,
  canManage,
  onChanged,
}: {
  clubId: number;
  canManage: boolean;
  onChanged?: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [schedules, setSchedules] = useState<ScheduleDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  // 현재 month 기준 from/to 로딩
  const fetchMonthSchedules = async (baseDate: Date) => {
    if (!clubId || Number.isNaN(clubId)) return;

    setLoading(true);
    setError(null);

    try {
      const fromDate = new Date(baseDate);
      fromDate.setDate(1);

      const toDate = new Date(baseDate);
      toDate.setMonth(toDate.getMonth() + 1);
      toDate.setDate(0); // 이번 달 마지막 날

      const from = formatYMD(fromDate);
      const to = formatYMD(toDate);

      const res = await authApiRequest<{ schedules: ScheduleDTO[] }>(
        `/clubs/${clubId}/schedules?from=${from}&to=${to}`,
      );

      setSchedules(res.schedules ?? []);
    } catch (e: any) {
      console.error("월간 일정 조회 실패", e);
      setSchedules([]);
      setError(e.message ?? "일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthSchedules(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, currentMonth]);

  // 달력용 날짜 계산
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay(); // 0~6
  const lastDayDate = new Date(year, month + 1, 0);
  const lastDate = lastDayDate.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= lastDate; d += 1) {
    cells.push(new Date(year, month, d));
  }

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const monthLabel = `${year}년 ${month + 1}월`;

  /** ------------ 삭제 ------------- */
  const handleDelete = async (scheduleId: number) => {
    if (!canManage) return;

    const ok = window.confirm("이 일정을 삭제하시겠습니까?");
    if (!ok) return; // 🔴 취소하면 바로 종료 (서버 요청 X)

    try {
      await authApiRequest<{}>(
        `/clubs/${clubId}/schedules/${scheduleId}`,
        {
          method: "DELETE",
        },
      );

      // 프론트 목록 갱신
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));

      // 우측 패널/상위 컴포넌트도 갱신
      onChanged?.();
    } catch (e: any) {
      console.error("일정 삭제 실패", e);
      alert(e.message ?? "일정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  /** --------- 드래그 & 드롭으로 날짜 이동 ---------- */
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number) => {
    if (!canManage) return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDayDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canManage) return;
    e.preventDefault();
  };

  const handleDayDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    day: Date,
  ) => {
    if (!canManage) return;

    e.preventDefault();
    const idStr = e.dataTransfer.getData("text/plain");
    const scheduleId = Number(idStr || draggingId);
    if (!scheduleId) return;

    const target = schedules.find((s) => s.id === scheduleId);
    if (!target) return;

    const oldStart = new Date(target.startAt);
    const oldEnd = new Date(target.endAt);

    const durationDays =
      Math.max(
        1,
        Math.round(
          (oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1,
      );

    const newStart = new Date(day);
    newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + durationDays - 1);

    try {
      await authApiRequest<ScheduleDTO>(
        `/clubs/${clubId}/schedules/${scheduleId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            startAt: newStart.toISOString(),
            endAt: newEnd.toISOString(),
          }),
        },
      );

      // 다시 월간 일정 로딩
      await fetchMonthSchedules(currentMonth);
      onChanged?.();
    } catch (err: any) {
      console.error("일정 이동 실패", err);
      alert(err.message ?? "일정을 옮기는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDraggingId(null);
    }
  };

  return (
    <div>
      {/* 상단 헤더: 월 이동 컨트롤 + 새 일정 버튼은 부모에서 처리 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ◀ 이전 달
        </button>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{monthLabel}</div>
        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          다음 달 ▶
        </button>
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
          일정을 불러오는 중...
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>
          {error}
        </div>
      )}

      {/* 요일 헤더 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 2,
          marginBottom: 4,
          fontSize: 11,
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 4,
        }}
      >
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  borderRadius: 8,
                  minHeight: 48,
                  background: "#f9fafb",
                }}
              />
            );
          }

          const dayStr = formatYMD(day);

          const daySchedules = schedules.filter((s) => {
            const startStr = s.startAt.slice(0, 10);
            const endStr = s.endAt.slice(0, 10);
            return startStr <= dayStr && dayStr <= endStr;
        });

          return (
            <div
              key={dayStr}
              onDragOver={handleDayDragOver}
              onDrop={(e) => handleDayDrop(e, day)}
              style={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                padding: 4,
                minHeight: 60,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                {day.getDate()}
              </div>

              {daySchedules.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="schedule-chip"
                  draggable={canManage}
                  onDragStart={(e) => handleDragStart(e, s.id)}
                  onDragEnd={handleDragEnd}
                  title={s.title}
                >
                  <span className="schedule-chip-title">{s.title}</span>
                  {canManage && (
                    <button
                      type="button"
                      className="schedule-chip-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDelete(s.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {daySchedules.length > 3 && (
                <div style={{ fontSize: 10, color: "#6b7280" }}>
                  +{daySchedules.length - 3}개 더
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** =======================
 *   클럽 상세 페이지
 * ======================= */
export default function ClubDetailPage() {
  const params = useParams<{ clubId: string }>();
  const router = useRouter();
  const { user } = useAuth({ required: true });

  const clubIdNumber = Number(params.clubId);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinStatus, setJoinStatus] = useState<JoinStatus>("unknown");
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [myRole, setMyRole] = useState<ClubMemberRole | null>(null);
  const canManageSchedules =
    user?.role === "ADMIN" || myRole === "LEADER" || myRole === "WRITER";

  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [noticePosts, setNoticePosts] = useState<RecentPost[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(false);

  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleDTO[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  //멤버 관련
  const [members, setMembers] = useState<ClubMemberSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);


  // 동아리 정보 + 내 역할
  useEffect(() => {
    if (!clubIdNumber || Number.isNaN(clubIdNumber)) return;

    const fetchData = async () => {
      try {
        const [clubRes, myClubsRes] = await Promise.all([
          authApiRequest<{ club: ClubDetail }>(`/clubs/${clubIdNumber}`),
          authApiRequest<{ clubs: MyClub[] }>("/clubs/my"),
        ]);

        setClub(clubRes.club);

        const membership = myClubsRes.clubs.find(
          (c) => c.id === clubIdNumber,
        );

        if (membership) {
          setJoinStatus("joined");
          setMyRole(membership.role);
        } else {
          setJoinStatus("not-joined");
          setMyRole(null);
        }

        const isAdmin = user?.role === "ADMIN";
        const isLeader = membership?.role === "LEADER";
        setIsLeaderOrAdmin(Boolean(isAdmin || isLeader));
      } catch (e: any) {
        setError(e.message ?? "동아리 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clubIdNumber, user?.role]);

  // 우측 패널 데이터 fetch (재사용 가능하게 함수로 분리)
 // 우측 패널 데이터 fetch (재사용 가능하게 함수로 분리)
const fetchRightPanels = async () => {
  if (!clubIdNumber || Number.isNaN(clubIdNumber)) return;

  // 가입 안 된 상태면 전부 비우고 종료
  if (joinStatus !== "joined") {
    setRecentPosts([]);
    setNoticePosts([]);
    setUpcomingSchedules([]);
    setMembers([]);
    setRecentLoading(false);
    setNoticeLoading(false);
    setScheduleLoading(false);
    setMembersLoading(false);
    return;
  }

  setRecentLoading(true);
  setNoticeLoading(true);
  setScheduleLoading(true);
  setMembersLoading(true);

  try {
    const baseQuery = `page=1&pageSize=3&sort=latest`;

    // 🔹 공지/게시글 + 일정 + 멤버를 모두 병렬로 요청
    const [recentRes, noticeRes, scheduleRes, membersRes] = await Promise.all([
      authApiRequest<{ posts: RecentPost[] }>(
        `/clubs/${clubIdNumber}/posts?${baseQuery}`,
      ),
      authApiRequest<{ posts: RecentPost[] }>(
        `/clubs/${clubIdNumber}/posts?${baseQuery}&onlyNotice=true`,
      ),
      (async () => {
        const today = new Date();
        const from = today.toISOString().slice(0, 10);
        const toDate = new Date();
        toDate.setDate(today.getDate() + 30);
        const to = toDate.toISOString().slice(0, 10);

        return authApiRequest<{ schedules: ScheduleDTO[] }>(
          `/clubs/${clubIdNumber}/schedules?from=${from}&to=${to}&limit=3`,
        );
      })(),
      // 🔹 멤버 목록 호출
      authApiRequest<{ members: ClubMemberSummary[] }>(
        `/clubs/${clubIdNumber}/members`,
      ),
    ]);

    const recent = Array.isArray(recentRes.posts)
      ? recentRes.posts.slice(0, 3)
      : [];
    const rawnotices = Array.isArray(noticeRes.posts) ? noticeRes.posts : [];

    const notices = rawnotices
      .filter((post) => post.isNotice === true)
      .slice(0, 3);

    setRecentPosts(recent);
    setNoticePosts(notices);
    setUpcomingSchedules(scheduleRes.schedules ?? []);

    // 🔹 멤버 상태 갱신 (우측 패널에 사용)
    setMembers(membersRes.members ?? []);
  } catch (e) {
    console.error("대시보드 우측 패널 데이터 조회 실패", e);
  } finally {
    setRecentLoading(false);
    setNoticeLoading(false);
    setScheduleLoading(false);
    setMembersLoading(false);
  }
};


  useEffect(() => {
    fetchRightPanels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubIdNumber, joinStatus]);

  const handleJoin = async () => {
    if (!clubIdNumber || Number.isNaN(clubIdNumber)) return;
    setJoinMessage(null);
    setJoinLoading(true);

    try {
      const res = await authApiRequest<{ message: string }>(
        `/clubs/${clubIdNumber}/join`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      setJoinMessage(res.message ?? "가입 신청이 완료되었습니다.");
      setJoinStatus("joined");
    } catch (e: any) {
      setJoinMessage(e.message ?? "가입 신청에 실패했습니다.");
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-main" style={{ padding: 40 }}>
        동아리 정보를 불러오는 중...
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="dashboard-main" style={{ padding: 40 }}>
        <h1 className="page-title">Club</h1>
        <p style={{ marginTop: 12, color: "#ef4444" }}>
          {error ?? "동아리 정보를 찾을 수 없습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-main hide-scrollbar" style={{ padding: 24 }}>
      {/* 상단: 동아리 기본 정보 + 가입/관리 버튼 */}
      <header style={{ marginBottom: 24 }}>
        <h1 className="page-title">{club.name}</h1>
        {club.description && (
          <p style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
            {club.description}
          </p>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {joinStatus === "not-joined" && (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joinLoading}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #16a34a",
                background: "#22c55e",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {joinLoading ? "신청 중..." : "이 동아리에 가입 신청"}
            </button>
          )}

          {joinStatus === "joined" && (
            <span style={{ fontSize: 13, color: "#16a34a" }}>
              가입된 동아리
            </span>
          )}

          {joinMessage && (
            <span style={{ fontSize: 12, color: "#4b5563" }}>{joinMessage}</span>
          )}
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <div className="dashboard-content">
        {/* 중앙 캘린더 */}
        <section className="dashboard-calendar">
          <div
            className="panel-title"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>동아리 일정</span>
            {canManageSchedules && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/clubs/${clubIdNumber}/schedules/new`)
                }
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  background: "#4b5563",
                  color: "#ffffff",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                새 일정 추가
              </button>
            )}
          </div>

          <div className="calendar-box">
            <ClubScheduleCalendar
              clubId={clubIdNumber}
              canManage={canManageSchedules}
              onChanged={fetchRightPanels}
            />
          </div>
        </section>

        {/* 오른쪽 패널들 (공지 / 게시글 / 멤버 / 다가오는 일정) */}
        <aside className="dashboard-right">
          {/* 공지 */}
          <div className="right-card">
            <div className="panel-title">동아리 공지</div>
            <div className="card-body">
              {noticeLoading && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  공지글을 불러오는 중...
                </div>
              )}

              {!noticeLoading && noticePosts.length === 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  등록된 공지가 없습니다.
                </div>
              )}

              {!noticeLoading && noticePosts.length > 0 && (
                <ul
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {noticePosts.map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/clubs/${clubIdNumber}/posts/${post.id}`,
                          )
                        }
                        style={{
                          width: "100%",
                          textAlign: "left",
                          fontSize: 13,
                          padding: "4px 6px",
                          borderRadius: 8,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              marginRight: 4,
                              padding: "1px 4px",
                              borderRadius: 999,
                              background: "#fee2e2",
                              color: "#b91c1c",
                            }}
                          >
                            공지
                          </span>
                          {post.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9ca3af",
                            marginTop: 2,
                          }}
                        >
                          {new Date(post.createdAt).toLocaleDateString()} · 댓글{" "}
                          {post.commentCount} · 조회 {post.viewCount}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 게시글 */}
        <div className="right-card">
          <div
            className="panel-title"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>게시글</span>

            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/clubs/${clubIdNumber}/posts`)
              }
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              게시판 열기 / 새 글 작성
            </button>
          </div>

          <div className="card-body">
            {recentLoading && (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                게시글을 불러오는 중...
              </div>
            )}

            {!recentLoading && recentPosts.length === 0 && (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                아직 게시글이 없습니다.
              </div>
            )}

            {!recentLoading && recentPosts.length > 0 && (
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginBottom: 0,
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {recentPosts.map((post) => (
                  <li key={post.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/clubs/${clubIdNumber}/posts/${post.id}`,
                        )
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        fontSize: 13,
                        padding: "4px 6px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {post.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          marginTop: 2,
                        }}
                      >
                        {new Date(post.createdAt).toLocaleDateString()} · 댓글{" "}
                        {post.commentCount} · 조회 {post.viewCount}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>


          {/* 멤버 */}
          <div className="right-card">
            <div className="panel-title">멤버</div>
              <div className="card-body">
                {membersLoading && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    멤버를 불러오는 중...
                  </div>
                )}

                {!membersLoading && members.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    아직 가입된 멤버가 없습니다.
                  </div>
                )}

                {!membersLoading && members.length > 0 && (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {members.slice(0, 5).map((m) => (
                      <li key={m.id}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {m.name}
                        </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        {m.role} · {m.tier} ·{" "}
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {joinStatus === "joined" && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/clubs/${clubIdNumber}/members`)
                  }
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #0f172a",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  멤버 조회
                </button>
              )}
            </div>
          </div>

          {/* 다가오는 일정 */}
          <div className="right-card">
            <div className="panel-title">다가오는 일정</div>
            <div className="card-body">
              {scheduleLoading && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  일정을 불러오는 중...
                </div>
              )}
              {!scheduleLoading && upcomingSchedules.length === 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  예정된 일정이 없습니다.
                </div>
              )}
              {!scheduleLoading && upcomingSchedules.length > 0 && (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {upcomingSchedules.map((s) => {
                    const start = new Date(s.startAt);
                    const end = new Date(s.endAt);
                    const same = start.toDateString() === end.toDateString();

                    const dateLabel = same
                      ? start.toLocaleDateString()
                      : `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`;

                    return (
                      <li key={s.id}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {dateLabel}
                          {s.content && ` · ${s.content}`}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
