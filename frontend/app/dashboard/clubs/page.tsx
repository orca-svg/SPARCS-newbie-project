"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";

interface ClubSummary {
  id: number;
  name: string;
  description: string | null;
}

interface MyClub {
  id: number;
  name: string;
}

// 각 동아리별 내 상태
type MembershipStatus = "NONE" | "JOINED" | "PENDING";

export default function ClubsDirectoryPage() {
  const router = useRouter();

  const [allClubs, setAllClubs] = useState<ClubSummary[]>([]);
  const [myClubIds, setMyClubIds] = useState<number[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, MembershipStatus>>(
    {},
  );

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [allRes, myRes] = await Promise.all([
        authApiRequest<{ clubs: ClubSummary[] }>("/clubs"),
        authApiRequest<{ clubs: MyClub[] }>("/clubs/my"),
      ]);

      const all = allRes.clubs ?? [];
      const my = myRes.clubs ?? [];
      const joinedIds = my.map((c) => c.id);

      setAllClubs(all);
      setMyClubIds(joinedIds);

      // statusMap 초기화/동기화
      setStatusMap((prev) => {
        const next: Record<number, MembershipStatus> = { ...prev };

        all.forEach((club) => {
          if (joinedIds.includes(club.id)) {
            next[club.id] = "JOINED";
          } else if (!next[club.id]) {
            next[club.id] = "NONE";
          }
        });

        return next;
      });
    } catch (e: any) {
      setErrorMsg(e.message ?? "동아리 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJoin = async (clubId: number) => {
    try {
      await authApiRequest(`/clubs/${clubId}/join`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      // 가입 신청 성공 → 상태를 PENDING 으로 표시
      setStatusMap((prev) => ({
        ...prev,
        [clubId]: "PENDING",
      }));
      alert("가입 신청을 보냈습니다.");
    } catch (e: any) {
      const msg: string = e?.message ?? "가입 신청에 실패했습니다.";

      // 백엔드 에러 메시지에 따라 상태 업데이트 (있으면 활용)
      if (msg.includes("이미 가입된 동아리")) {
        setStatusMap((prev) => ({
          ...prev,
          [clubId]: "JOINED",
        }));
      } 

      alert(msg);
    }
  };

  const handleCreateClub = async () => {
    if (!newName.trim()) {
      alert("동아리 이름을 입력해 주세요.");
      return;
    }
    try {
      const res = await authApiRequest<{ club: ClubSummary }>("/clubs", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          description: newDesc,
        }),
      });

      setNewName("");
      setNewDesc("");

      // 새로 만든 동아리 상세 페이지로 이동
      router.push(`/dashboard/clubs/${res.club.id}`);
    } catch (e: any) {
      alert(e.message ?? "동아리 생성에 실패했습니다.");
    }
  };

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      <h1 className="page-title">동아리 찾기 / 가입하기</h1>

      {/* 새 동아리 생성 섹션 */}
      <section
        style={{
          marginTop: 16,
          marginBottom: 24,
          padding: 16,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          새 동아리 생성
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="동아리 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #d1d5db",
            }}
          />
          <textarea
            placeholder="동아리 소개 (선택)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              resize: "none",
            }}
          />
          <button
            type="button"
            onClick={handleCreateClub}
            style={{
              alignSelf: "flex-start",
              padding: "6px 12px",
              borderRadius: 999,
              background: "#0f172a",
              color: "#fff",
              fontSize: 12,
              border: "none",
              cursor: "pointer",
            }}
          >
            동아리 생성
          </button>
        </div>
      </section>

      {/* 전체 동아리 목록 */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>전체 동아리 목록</h2>

        {loading && <div style={{ marginTop: 8 }}>불러오는 중...</div>}

        {errorMsg && (
          <div style={{ marginTop: 8, color: "#ef4444", fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && allClubs.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
            아직 동아리가 없습니다. 새 동아리를 생성하거나 가입해보세요!
          </div>
        )}

        <ul
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {allClubs.map((club) => {
            const status: MembershipStatus =
              statusMap[club.id] ??
              (myClubIds.includes(club.id) ? "JOINED" : "NONE");

            return (
              <li
                key={club.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(`/dashboard/clubs/${club.id}`)
                  }
                >
                  <div style={{ fontWeight: 600 }}>{club.name}</div>
                  {club.description && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {club.description}
                    </div>
                  )}
                </div>

                {/* 오른쪽 상태/버튼 영역 */}
                <div>
                  {status === "JOINED" && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#16a34a",
                        fontWeight: 500,
                      }}
                    >
                      가입됨
                    </span>
                  )}

                  {status === "PENDING" && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#f97316",
                        fontWeight: 500,
                      }}
                    >
                      가입 신청 대기 중
                    </span>
                  )}

                  {status === "NONE" && (
                    <button
                      type="button"
                      onClick={() => handleJoin(club.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #22c55e",
                        background: "#22c55e1a",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      가입 신청
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
