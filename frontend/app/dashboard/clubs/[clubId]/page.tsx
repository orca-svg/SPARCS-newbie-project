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

type JoinStatus = "unknown" | "joined" | "not-joined";

export default function ClubDetailPage() {
  const params = useParams<{ clubId: string }>();
  const router = useRouter();
  const { user } = useAuth({ required: true }); // user.role 사용

  const clubIdNumber = Number(params.clubId);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinStatus, setJoinStatus] = useState<JoinStatus>("unknown");
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (!clubIdNumber || Number.isNaN(clubIdNumber)) return;

    const fetchData = async () => {
      try {
        // 1) 클럽 정보 + 2) 내가 가입한 클럽 목록을 동시에 조회
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
        } else {
          setJoinStatus("not-joined");
        }

        // ADMIN 이거나, 이 클럽의 LEADER 인지 체크
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

        {/* 가입/상태 영역 */}
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

          {/* 리더/관리자만 보이는 버튼 */}
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

      {/* 아래는 나중에 실제 기능으로 채울 영역들 */}
      <div className="dashboard-content">
        {/* 중앙: 이 동아리 전용 캘린더 자리 */}
        <section className="dashboard-calendar">
          <div className="panel-title">동아리 일정</div>
          <div className="calendar-box">
            나중에 이 동아리의 Schedule(일정)을 달력 형태로 보여줄 자리
          </div>
        </section>

        {/* 오른쪽: 공지 / 게시판 / 멤버 박스 */}
        <aside className="dashboard-right">
          <div className="right-card">
            <div className="panel-title">동아리 공지</div>
            <div className="card-body">이 동아리의 공지 글 목록 자리</div>
          </div>

          <div className="right-card">
            <div className="panel-title">게시글</div>
            <div className="card-body">게시판/글 목록이 들어올 자리</div>
          </div>

          <div className="right-card">
            <div className="panel-title">멤버</div>
            <div className="card-body">LEADER / WRITER / READER / tier 등</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
