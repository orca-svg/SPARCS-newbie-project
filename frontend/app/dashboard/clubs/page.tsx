// frontend/app/dashboard/clubs/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authApiRequest } from "@/lib/api";

interface Club {
  id: number;
  name: string;
  description: string | null;
}

export default function MyClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyClubs = async () => {
      try {
        const data = await authApiRequest<{ clubs: Club[] }>("/clubs/my");
        setClubs(data.clubs);
      } catch (e: any) {
        setError(e.message ?? "내 동아리 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyClubs();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-main" style={{ padding: 40 }}>
        내 동아리 목록 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-main" style={{ padding: 40 }}>
        <h1 className="page-title">My Clubs</h1>
        <p style={{ color: "#ef4444", marginTop: 12 }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-main" style={{ padding: 40 }}>
      <h1 className="page-title">My Clubs</h1>

      {clubs.length === 0 ? (
        <p style={{ marginTop: 16, fontSize: 14, color: "#666" }}>
          아직 가입된 동아리가 없습니다. <br />
          나중에 “동아리 가입” 기능을 만들면 이곳에 가입된 동아리가 표시됩니다.
        </p>
      ) : (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 480,
          }}
        >
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/dashboard/clubs/${club.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {club.name}
                </div>
                {club.description && (
                  <div
                    style={{
                      fontSize: 13,
                      marginTop: 4,
                      color: "#6b7280",
                    }}
                  >
                    {club.description}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
