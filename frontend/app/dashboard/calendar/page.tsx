// frontend/app/dashboard/calendar/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApiRequest } from "@/lib/api";

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

interface CombinedSchedule {
  id: number;
  clubId: number;
  clubName: string;
  title: string;
  startAt: string;
  endAt: string;
  content: string | null;
}

// 태그 색상 팔레트
const TAG_COLORS = [
  { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  { bg: "#fef9c3", text: "#854d0e", border: "#fef3c7" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  { bg: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
];

type TagColor = (typeof TAG_COLORS)[number];

function formatYMD(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function DashboardCalendarPage() {
  const { user } = useAuth({ required: true });
  const router = useRouter();

  const [clubs, setClubs] = useState<MyClub[]>([]);
  const [clubColorMap, setClubColorMap] = useState<Record<number, TagColor>>(
    {},
  );

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [schedules, setSchedules] = useState<CombinedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 내가 가입한 클럽 + 월간 일정 불러오기
  const loadData = async (baseDate: Date) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1) 내 동아리 목록
      const myClubsRes = await authApiRequest<{ clubs: MyClub[] }>(
        "/clubs/my",
      );
      const myClubs = myClubsRes.clubs ?? [];
      setClubs(myClubs);

      if (myClubs.length === 0) {
        setSchedules([]);
        return;
      }

      // 2) 클럽별 태그 색상 매핑 (index 기반)
      const colorMap: Record<number, TagColor> = {};
      myClubs.forEach((club, idx) => {
        colorMap[club.id] = TAG_COLORS[idx % TAG_COLORS.length];
      });
      setClubColorMap(colorMap);

      // 3) 해당 월 from/to 계산
      const fromDate = new Date(baseDate);
      fromDate.setDate(1);
      const toDate = new Date(baseDate);
      toDate.setMonth(toDate.getMonth() + 1);
      toDate.setDate(0);

      const from = formatYMD(fromDate);
      const to = formatYMD(toDate);

      // 4) 클럽별 월간 일정 병렬 요청
      const responses = await Promise.all(
        myClubs.map((club) =>
          authApiRequest<{ schedules: ScheduleDTO[] }>(
            `/clubs/${club.id}/schedules?from=${from}&to=${to}`,
          ).then((res) => ({ club, schedules: res.schedules ?? [] })),
        ),
      );

      const merged: CombinedSchedule[] = [];
      responses.forEach(({ club, schedules: clubSchedules }) => {
        clubSchedules.forEach((s) => {
          merged.push({
            id: s.id,
            clubId: s.clubId,
            clubName: club.name,
            title: s.title,
            startAt: s.startAt,
            endAt: s.endAt,
            content: s.content,
          });
        });
      });

      setSchedules(merged);
    } catch (e: any) {
      setErrorMsg(e.message ?? "일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  // 달력용 날짜 계산
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
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

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      <h1 className="page-title">내 모든 일정</h1>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
        {user?.name ?? "사용자"} 님이 가입한 모든 동아리의 일정을 월간
        달력으로 확인할 수 있습니다.
      </p>

      {/* 동아리 태그 레전드 */}
      {clubs.length > 0 && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {clubs.map((club) => {
            const color = clubColorMap[club.id] ?? TAG_COLORS[0];
            return (
              <span
                key={club.id}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: color.bg,
                  color: color.text,
                  border: `1px solid ${color.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {club.name}
              </span>
            );
          })}
        </div>
      )}

      {/* 🔹 달력 전체 래퍼 (폭 고정 + 가운데 정렬) */}
      <div style={{ maxWidth: 980, margin: "8px auto 0" }}>
        {/* 상단 월 이동 컨트롤: 7열 그리드의 1열/7열에 버튼 배치 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          {/* 1열: 이전 달 버튼 (일요일 위) */}
          <div>
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
          </div>

          {/* 2~6열: 가운데 월 텍스트 */}
          <div
            style={{
              gridColumn: "2 / span 5",
              textAlign: "center",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {monthLabel}
          </div>

          {/* 7열: 다음 달 버튼 (토요일 위) */}
          <div style={{ textAlign: "right" }}>
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
        </div>

        {loading && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
            일정을 불러오는 중...
          </div>
        )}
        {errorMsg && (
          <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>
            {errorMsg}
          </div>
        )}

        {clubs.length === 0 && !loading && !errorMsg && (
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
            가입된 동아리가 없어 표시할 일정이 없습니다.
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
                    minHeight: 60,
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
                style={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  padding: 4,
                  minHeight: 90,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
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

                {daySchedules.slice(0, 3).map((s) => {
                  const color = clubColorMap[s.clubId] ?? TAG_COLORS[0];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/clubs/${s.clubId}`)
                      }
                      className="schedule-chip"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        width: "100%",
                        borderRadius: 999,
                        border: `1px solid ${color.border}`,
                        background: color.bg,
                        color: color.text,
                        padding: "2px 6px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                      title={`${s.clubName} · ${s.title}`}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 4px",
                          borderRadius: 999,
                          background: "#ffffffaa",
                          color: color.text,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.clubName}
                      </span>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.title}
                      </span>
                    </button>
                  );
                })}

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
    </div>
  );
}
