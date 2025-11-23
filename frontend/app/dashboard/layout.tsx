"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth({ required: true });

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
    }
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="dashboard-root">
        <div className="dashboard-main" style={{ padding: 40 }}>
          로딩 중...
        </div>
      </div>
    );
  }

  // required: true 이기 때문에 여기 내려왔다는 건 이미 로그인 OK 상태
  return (
    <div className="dashboard-root">
      {/* 왼쪽 사이드바 */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div>Club Planner</div>
          <div style={{ fontSize: 12, marginTop: 4, color: "#888" }}>
            {user ? `${user.name} 님` : ""}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Menu</div>
          <button className="sidebar-item">Home</button>
          <button className="sidebar-item">Notice</button>
          <button className="sidebar-item">Calendar</button>

          <div className="sidebar-section-title" style={{ marginTop: 16 }}>
            My Clubs
          </div>
          {/* dummy */}
          <button className="sidebar-item">예시 동아리 1</button>
          <button className="sidebar-item">예시 동아리 2</button>
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

      <main className="dashboard-main">{children}</main>
    </div>
  );
}
