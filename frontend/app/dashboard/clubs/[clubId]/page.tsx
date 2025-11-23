"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authApiRequest } from "@/lib/api";

interface ClubDetail {
  id: number;
  name: string;
  description: string | null;
  createdAt?: string;
}

export default function ClubDetailPage() {
  const params = useParams();
  const clubId = params.clubId; // 문자열

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;

    const fetchClub = async () => {
      try {
        const data = await authApiRequest<{ club: ClubDetail }>(
          `/clubs/${clubId}`,
        );
        setClub(data.club);
      } catch (e: any) {
        setError(e.message ?? "동아리 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [clubId]);

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
      {/* 상단: 동아리 기본 정보 */}
      <header style={{ marginBottom: 24 }}>
        <h1 className="page-title">{club.name}</h1>
        {club.description && (
          <p style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
            {club.description}
          </p>
        )}
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
