"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface JoinRequestUser {
  id: number;
  name: string;
  email: string;
}

interface JoinRequest {
  id: number;
  userId: number;
  clubId: number;
  approved: boolean;
  role: "LEADER" | "WRITER" | "READER";
  tier: "JUNIOR" | "SENIOR" | "MANAGER";
  createdAt: string;
  user: JoinRequestUser;
}

interface MyClub {
  id: number;
  name: string;
  description: string | null;
  role: "LEADER" | "WRITER" | "READER";
  tier: "JUNIOR" | "SENIOR" | "MANAGER";
}

export default function ClubJoinRequestsPage() {
  const params = useParams<{ clubId: string }>();
  const router = useRouter();
  const { user } = useAuth({ required: true });

  const clubId = Number(params.clubId);
  const [clubName, setClubName] = useState<string>("");
  const [myTier, setMyTier] = useState<
    "JUNIOR" | "SENIOR" | "MANAGER" | null
  >(null);
  
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (Number.isNaN(clubId)) return;
    setLoading(true);
    setErrorMsg(null);

    try {
    // 가입 요청 + 내 클럽 목록을 동시에 가져온다
    const [requestsData, myClubsData] = await Promise.all([
      authApiRequest<{ requests: JoinRequest[] }>(
        `/clubs/${clubId}/requests`,
      ),
      authApiRequest<{ clubs: MyClub[] }>("/clubs/my"),
    ]);

    setRequests(requestsData.requests ?? []);

    // 현재 클럽에 대한 나의 membership 찾기
    const membership = myClubsData.clubs.find((c) => c.id === clubId);

    if (membership) {
      setClubName(membership.name);
      setMyTier(membership.tier);
    } else {
      // 혹시 이 클럽 멤버가 아니라면 최소 clubId만이라도 보이게
      setClubName("");
      setMyTier(null);
    }
  } catch (e: any) {
    setErrorMsg(e.message ?? "가입 요청 목록을 불러오지 못했습니다.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRequests();
  }, [clubId]);

  const handleApprove = async (memberId: number) => {
    const ok = window.confirm("이 사용자의 가입을 승인하시겠습니까?");
    if (!ok) return;

    try {
      await authApiRequest(
        `/clubs/${clubId}/members/${memberId}/approve`,
        { method: "POST" },
      );
      await fetchRequests();
    } catch (e: any) {
      alert(e.message ?? "승인에 실패했습니다.");
    }
  };

  const handleReject = async (memberId: number) => {
    const ok = window.confirm("이 가입 요청을 거절하시겠습니까?");
    if (!ok) return;

    try {
      await authApiRequest(
        `/clubs/${clubId}/members/${memberId}/reject`,
        { method: "POST" },
      );
      await fetchRequests();
    } catch (e: any) {
      alert(e.message ?? "거절에 실패했습니다.");
    }
  };

  if (Number.isNaN(clubId)) {
    return (
      <div className="dashboard-main" style={{ padding: 32 }}>
        잘못된 클럽 주소입니다.
      </div>
    );
  }

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 className="page-title">가입 요청 관리</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          {`${clubName || `Club #${clubId}`} · ${myTier ?? "TIER"} · ${user?.name ?? ""} 님`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/clubs/${clubId}`)}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            cursor: "pointer",
          }}
        >
          동아리 대시보드로 돌아가기
        </button>
      </div>

      {loading && <div>요청 목록을 불러오는 중...</div>}

      {errorMsg && (
        <div style={{ marginTop: 8, color: "#ef4444", fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && requests.length === 0 && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          현재 대기 중인 가입 요청이 없습니다.
        </div>
      )}

      <ul
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {requests.map((req) => (
          <li
            key={req.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fff",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {req.user?.name ?? "이름 없음"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {req.user?.email}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginTop: 4,
                }}
              >
                role: {req.role} / tier: {req.tier}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleApprove(req.id)}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #22c55e",
                  background: "#22c55e1a",
                  cursor: "pointer",
                }}
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => handleReject(req.id)}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #ef4444",
                  background: "#fee2e2",
                  cursor: "pointer",
                }}
              >
                거절
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
