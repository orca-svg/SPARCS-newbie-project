"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authApiRequest } from "@/lib/api";

interface Club {
  id: number;
  name: string;
  description?: string | null;
  role?: "LEADER" | "WRITER" | "READER";
  tier?: "JUNIOR" | "SENIOR" | "MANAGER";
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth({ required: true });

  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
    }
    router.replace("/login");
  };

  useEffect(() => {
    const fetchMyClubs = async () => {
      try {
        const data = await authApiRequest<{ clubs: Club[] }>("/clubs/my");
        setClubs(data.clubs);
      } catch (e) {
        // 필요하면 에러 상태 저장
      } finally {
        setClubsLoading(false);
      }
    };

    fetchMyClubs();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-root">
        <div className="dashboard-main" style={{ padding: 40 }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      {/* 왼쪽 사이드바 */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div>Club Planner</div>
          <div style={{ fontSize: 12, marginTop: 5, color: "#676767ff" }}>
            {user ? `${user.name} 님` : ""}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Menu</div>

          <button
            className="sidebar-item"
            type="button"
            onClick={() => router.push("/dashboard")}
          >
            Home
          </button>
          <button
            className="sidebar-item"
            type="button"
            onClick={() => router.push("/dashboard/notice")}
          >
            Notice
          </button>
          <button
            className="sidebar-item"
            type="button"
            onClick={() => router.push("/dashboard/calendar")}
          >
            Calendar
          </button>

          <div className="sidebar-section-title" style={{ marginTop: 16 }}>
            My Clubs
          </div>

          
          {clubsLoading ? (
            <div className="sidebar-item sidebar-item--muted">
              동아리 불러오는 중...
            </div>
          ) : clubs.length === 0 ? (
            <div className="sidebar-item sidebar-item--muted">
              가입된 동아리가 없습니다.
            </div>
          ) : (
            <ul className="sidebar-club-list">
              {clubs.map((club) => (
                <li key={club.id}>
                  <button
                    type="button"
                    className="sidebar-item sidebar-item--club"
                    onClick={() => router.push(`/dashboard/clubs/${club.id}`)}
                  >
                    {club.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            style={{
              fontSize: 12,
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "6px 10px",
              width: "100%",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 오른쪽 메인 영역 */}
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
