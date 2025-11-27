"use client";

import { useEffect, useState, useCallback } from "react";
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

type JoinStatus = "unknown" | "joined" | "not-joined";
type ClubMemberRole = "LEADER" | "WRITER" | "READER";

function formatYMD(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function sameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

/** ------------------ 캘린더 컴포넌트 ------------------ */

interface ClubScheduleCalendarProps {
  clubId: number;
  canManage: boolean;
  onSchedulesChanged?: () => void | Promise<void>;
}

function ClubScheduleCalendar({
  clubId,
  canManage,
  onSchedulesChanged,
}: ClubScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [schedules, setSchedules] = useState<ScheduleDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const reloadMonth = useCallback(async () => {
    if (!clubId || Number.isNaN(clubId)) return;

    setLoading(true);
    setError(null);

    try {
      const fromDate = new Date(currentMonth);
      fromDate.setDate(1);

      const toDate = new Date(currentMonth);
      toDate.setMonth(toDate.getMonth() + 1);
      toDate.setDate(0);

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
  }, [clubId, currentMonth]);

  useEffect(() => {
    reloadMonth();
  }, [reloadMonth]);

  // 달력용 날짜 계산
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay(); // 0~6

  const lastDayDate = new Date(year, month + 1, 0);
  const lastDate = lastDayDate.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) days.push(null);
  for (let d = 1; d <= lastDate; d += 1) {
    days.push(new Date(year, month, d));
  }

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
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

  /** 드롭 시 날짜 변경 */
  const handleDayDrop = async (targetDateStr: string) => {
    if (!canManage || draggingId == null) return;

    const schedule = schedules.find((s) => s.id === draggingId);
    if (!schedule) return;

    const oldStart = new Date(schedule.startAt);
    const oldEnd = new Date(schedule.endAt);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    // targetDateStr = "YYYY-MM-DD"
    const newStart = new Date(`${targetDateStr}T00:00:00`);
    const newEnd = new Date(newStart.getTime() + durationMs);

    try {
      await authApiRequest(
        `/clubs/${clubId}/schedules/${schedule.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            startAt: newStart.toISOString(),
            endAt: newEnd.toISOString(),
          }),
        },
      );

      await reloadMonth();
      if (onSchedulesChanged) await onSchedulesChanged();
    } catch (e) {
      console.error(e);
      alert("일정을 옮기는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDraggingId(null);
    }
  };

  /** 삭제 */
  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!canManage) return;

    const ok = window.confirm("이 일정을 삭제하시겠습니까?");
    if (!ok) return; // 🔴 취소하면 여기서 바로 종료

    try {
      await authApiRequest(
        `/clubs/${clubId}/schedules/${scheduleId}`,
        {
          method: "DELETE",
        },
      );

      await reloadMonth();
      if (onSchedulesChanged) await onSchedulesChanged();
    } catch (e) {
      console.error(e);
      alert("일정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div>
      {/* 상단 헤더: 월 이동 */}
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
        {weeks.flatMap((week, wi) =>
          week.map((day, di) => {
            if (!day) {
              return (
                <div
                  key={`${wi}-${di}`}
                  style={{
                    borderRadius: 8,
                    minHeight: 60,
                    background: "#f9fafb",
                  }}
                />
              );
            }

            const dayStr = formatYMD(day);
            const daySchedules = schedules.filter((s) =>
              sameDay(s.startAt, dayStr),
            );

            return (
              <div
                key={`${wi}-${di}`}
                onDragOver={(e) => {
                  if (canManage && draggingId !== null) {
                    e.preventDefault();
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDayDrop(dayStr);
                }}
                style={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  padding: 4,
                  minHeight: 70,
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
                    draggable={canManage}
                    onDragStart={() => {
                      if (canManage) setDraggingId(s.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onMouseEnter={() => setHoveredId(s.id)}
                    onMouseLeave={() => setHoveredId((prev) => (prev === s.id ? null : prev))}
                    style={{
                      position: "relative",
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "#e5e7eb",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: canManage ? "grab" : "default",
                    }}
                    title={s.title}
                  >
                    <span>{s.title}</span>
                    {canManage && hoveredId === s.id && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteSchedule(s.id);
                        }}
                        style={{
                          position: "absolute",
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 10,
                          padding: "0 4px",
                          borderRadius: 999,
                          background: "#f97373",
                          color: "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        삭제
                      </span>
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
          }),
        )}
      </div>
    </div>
  );
}

/** ------------------ 메인 페이지 ------------------ */

export default function ClubDetailPage() {
  const params = useParams<{ clubId: string }>();
  const router = useRouter();
  const clubIdParam = params.clubId;
  const { user } = useAuth({ required: true });

  const clubIdNumber = Number(clubIdParam);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinStatus, setJoinStatus] = useState<JoinStatus>("unknown");
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [myRole, setMyRole] = useState<ClubMemberRole | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [noticePosts, setNoticePosts] = useState<RecentPost[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(false);

  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleDTO[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const canManageSchedules =
    user?.role === "ADMIN" ||
    myRole === "LEADER" ||
    myRole === "WRITER";

  /** 동아리 기본 정보 + 내 가입 상태 */
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

  /** 우측 패널(공지/게시글/다가오는 일정) 공통 fetch 함수 */
  const fetchRightPanels = useCallback(async () => {
    if (!clubIdNumber || Number.isNaN(clubIdNumber)) return;

    if (joinStatus !== "joined") {
      setRecentPosts([]);
      setNoticePosts([]);
      setUpcomingSchedules([]);
      setRecentLoading(false);
      setNoticeLoading(false);
      setScheduleLoading(false);
      return;
    }

    setRecentLoading(true);
    setNoticeLoading(true);
    setScheduleLoading(true);

    try {
      const baseQuery = `page=1&pageSize=3&sort=latest`;

      const [recentRes, noticeRes] = await Promise.all([
        authApiRequest<{ posts: RecentPost[] }>(
          `/clubs/${clubIdNumber}/posts?${baseQuery}`,
        ),
        authApiRequest<{ posts: RecentPost[] }>(
          `/clubs/${clubIdNumber}/posts?${baseQuery}&onlyNotice=true`,
        ),
      ]);

      const recent = Array.isArray(recentRes.posts)
        ? recentRes.posts.slice(0, 3)
        : [];
      const rawnotices = Array.isArray(noticeRes.posts)
        ? noticeRes.posts
        : [];

      const notices = rawnotices
        .filter((post) => post.isNotice === true)
        .slice(0, 3);

      const today = new Date();
      const from = today.toISOString().slice(0, 10);
      const toDate = new Date();
      toDate.setDate(today.getDate() + 30);
      const to = toDate.toISOString().slice(0, 10);

      const scheduleRes = await authApiRequest<{ schedules: ScheduleDTO[] }>(
        `/clubs/${clubIdNumber}/schedules?from=${from}&to=${to}&limit=3`,
      );

      setRecentPosts(recent);
      setNoticePosts(notices);
      setUpcomingSchedules(scheduleRes.schedules ?? []);
    } catch (e) {
      console.error("대시보드 우측 패널 데이터 조회 실패", e);
    } finally {
      setRecentLoading(false);
      setNoticeLoading(false);
      setScheduleLoading(false);
    }
  }, [clubIdNumber, joinStatus]);

  // 처음 & joinStatus 변경 시 우측 패널 로딩
  useEffect(() => {
    fetchRightPanels();
  }, [fetchRightPanels]);

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
    <div className="dashboard-main" style={{ padding: 24 }}>
      {/* 상단: 동아리 기본 정보 + 가입/관리 버튼 */}
      <header style={{ marginBottom: 24 }}>
        <h1 className="page-title">{club.name}</h1>
        {club.description && (
          <p style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
            {club.description}
          </p>
        )}

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
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
            <span style={{ fontSize: 12, color: "#4b5563" }}>
              {joinMessage}
            </span>
          )}

          {isLeaderOrAdmin && (
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/clubs/${clubIdNumber}/members`)
              }
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #888",
                background: "#6b6b6bff",
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              가입 요청 관리
            </button>
          )}
        </div>
      </header>

      <div className="dashboard-content">
        {/* 중앙: 캘린더 */}
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

          <div className="calendar-box" style={{ padding: 12 }}>
            <ClubScheduleCalendar
              clubId={clubIdNumber}
              canManage={canManageSchedules}
              onSchedulesChanged={fetchRightPanels}
            />
          </div>
        </section>

        {/* 오른쪽 패널 */}
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
            <div className="panel-title">게시글</div>
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
                    marginBottom: 8,
                    listStyle: "none",
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
                          {new Date(
                            post.createdAt,
                          ).toLocaleDateString()} · 댓글 {post.commentCount} ·
                          조회 {post.viewCount}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/clubs/${clubIdNumber}/posts`)
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #0f172a",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                게시판 열기 / 새 글 작성
              </button>
            </div>
          </div>

          {/* 멤버 */}
          <div className="right-card">
            <div className="panel-title">멤버</div>
            <div className="card-body">
              LEADER / WRITER / READER / tier 등
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
