"use client";

import { useEffect, useState } from "react";
import { useParams,  useRouter} from "next/navigation";
import { authApiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// 타입 정의
type Role = "LEADER" | "WRITER" | "READER";
type Tier = "JUNIOR" | "SENIOR" | "MANAGER";

interface MemberItem {
  id: number;
  userId: number;
  name: string;
  role: Role;
  tier: Tier;
  joinedAt: string;
  email?: string | null;

  draftRole: Role;
  draftTier: Tier;

  dirty: boolean;
}

interface MyClub {
  id: number;
  role: Role;
  tier: Tier;
}

type SortKey = "joinedAt" | "name" | "role";
type SortDir = "asc" | "desc";

export default function ClubMembersPage() {
  const params = useParams<{ clubId: string }>();
  const router = useRouter();
  const clubId = Number(params.clubId);
  const { user } = useAuth({ required: true });

  // 기본 상태
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [myTier, setMyTier] = useState<Tier | null>(null); 
  const [loading, setLoading] = useState(true);
  const [manageMode, setManageMode] = useState(false);
  const isLeaderOrAdmin = user?.role === "ADMIN" || myRole === "LEADER";

  // 정렬/필터/검색 상태
  const [filterRole, setFilterRole] = useState<Role | "ALL">("ALL");
  const [filterTier, setFilterTier] = useState<Tier | "ALL">("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // 멤버 불러오기
  const loadMembers = async () => {
    try {
      setLoading(true);

      const [myClubsRes, listRes] = await Promise.all([
        authApiRequest<{ clubs: MyClub[] }>("/clubs/my"),
        authApiRequest<{ members: MemberItem[] }>(
          `/clubs/${clubId}/members`,
        ),
      ]);

      const membership = myClubsRes.clubs.find((c) => c.id === clubId);
      setMyRole(membership?.role ?? null);
      setMyTier(membership?.tier ?? null); 

      const rawMembers = listRes.members ?? [];
      setMembers(
        rawMembers.map((m) => ({
          ...m,
          draftRole: m.role,
          draftTier: m.tier,
          dirty: false,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clubId || Number.isNaN(clubId)) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

    // role/tier 변경 (저장 버튼에서만 호출)
  const updateMember = async (memberId: number) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    // 변경 없음이면 서버 요청 안 함
    if (
      target.draftRole === target.role &&
      target.draftTier === target.tier
    ) {
      return;
    }

    try {
      await authApiRequest(`/clubs/${clubId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: target.draftRole,
          tier: target.draftTier,
        }),
      });

      // 성공 시: 실제 값 갱신 + dirty 초기화
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                role: target.draftRole,
                tier: target.draftTier,
                dirty: false,
              }
            : m,
        ),
      );

      alert("권한이 변경되었습니다.");
    } catch (e: any) {
      alert(e.message ?? "권한 변경 중 오류가 발생했습니다.");
    }
  };


  // 멤버 강퇴
  const removeMember = async (memberId: number) => {
    if (!window.confirm("정말 이 멤버를 내보내시겠습니까?")) return;

    try {
      await authApiRequest(`/clubs/${clubId}/members/${memberId}`, {
        method: "DELETE",
      });

      await loadMembers();
    } catch (e: any) {
      alert(e.message ?? "멤버 내보내기 중 오류가 발생했습니다.");
    }
  };

  // 🔎 정렬/필터/검색 적용된 최종 목록
  const filteredSortedMembers = (() => {
    let list = [...members];

    // 1) 필터: ROLE
    if (filterRole !== "ALL") {
      list = list.filter((m) => m.role === filterRole);
    }

    // 2) 필터: TIER
    if (filterTier !== "ALL") {
      list = list.filter((m) => m.tier === filterTier);
    }

    // 3) 검색: 이름 + 이메일
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      list = list.filter((m) => {
        const name = m.name?.toLowerCase() ?? "";
        const email = m.email?.toLowerCase() ?? "";
        return name.includes(kw) || email.includes(kw);
      });
    }

    // 4) 정렬
    const rolePriority: Record<Role, number> = {
      LEADER: 0,
      WRITER: 1,
      READER: 2,
    };

    list.sort((a, b) => {
      let cmp = 0;

      if (sortKey === "joinedAt") {
        const da = new Date(a.joinedAt).getTime();
        const db = new Date(b.joinedAt).getTime();
        cmp = da - db;
      } else if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name, "ko");
      } else if (sortKey === "role") {
        cmp = rolePriority[a.draftRole] - rolePriority[b.draftRole];
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  })();

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      <h1 className="page-title">멤버 목록</h1>

      {/* 상단 컨트롤 바 */}
      <div
        style={{
          marginTop: 12,
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* 검색 */}
        <input
          type="text"
          placeholder="이름 / 이메일 검색"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
            minWidth: 180,
          }}
        />

        {/* 역할 필터 */}
        <select
          value={filterRole}
          onChange={(e) =>
            setFilterRole(
              e.target.value === "ALL"
                ? "ALL"
                : (e.target.value as Role),
            )
          }
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
          }}
        >
          <option value="ALL">역할 전체</option>
          <option value="LEADER">LEADER</option>
          <option value="WRITER">WRITER</option>
          <option value="READER">READER</option>
        </select>

        {/* 티어 필터 */}
        <select
          value={filterTier}
          onChange={(e) =>
            setFilterTier(
              e.target.value === "ALL"
                ? "ALL"
                : (e.target.value as Tier),
            )
          }
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
          }}
        >
          <option value="ALL">티어 전체</option>
          <option value="JUNIOR">JUNIOR</option>
          <option value="SENIOR">SENIOR</option>
          <option value="MANAGER">MANAGER</option>
        </select>

        {/* 정렬 기준 */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
          }}
        >
          <option value="joinedAt">가입일순</option>
          <option value="name">이름순</option>
          <option value="role">역할순</option>
        </select>

        {/* 정렬 방향 */}
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as SortDir)}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
          }}
        >
          <option value="asc">오름차순 ↑</option>
          <option value="desc">내림차순 ↓</option>
        </select>

        {/* 멤버 관리 모드 토글 */}
        {isLeaderOrAdmin && (
          <button
            type="button"
            onClick={() => setManageMode((prev) => !prev)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #4b5563",
              background: "#4b5563",
              color: "#fff",
              fontSize: 12,
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            {manageMode ? "관리 모드 종료" : "멤버 관리"}
          </button>
          
        )}
        {isLeaderOrAdmin && (
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/clubs/${clubId}/join-requests`)
            }
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            가입 요청 관리
          </button>
        )}
      </div>

      {/* 멤버 리스트 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 640,
        }}
      >
        {loading && <p>멤버를 불러오는 중...</p>}

        {!loading && filteredSortedMembers.length === 0 && (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            조건에 맞는 멤버가 없습니다.
          </p>
        )}

        {!loading &&
          filteredSortedMembers.map((m) => (
            <div
              key={m.id}
              style={{
                background: "#fdfbf5",
                borderRadius: 12,
                padding: 16,
                border: "1px solid #e5e5e5",
              }}
            >
              {/* 상단: 이름 / 이메일 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
                {m.email && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
                      maxWidth: 200,
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                    title={m.email}
                  >
                    {m.email}
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginBottom: 10,
                  marginTop: 2,
                }}
              >
                가입일: {new Date(m.joinedAt).toLocaleDateString()} · 역할{" "}
                {m.role} · 티어 {m.tier}
              </div>

              {/* 관리 모드가 아닐 때: 정보만 */}
              {!manageMode && (
                <div style={{ fontSize: 12, color: "#4b5563" }}>
                  {/* 필요하면 여기 추가 설명 필드 넣기 */}
                </div>
              )}

              {/* 관리 모드 + 리더/ADMIN만, LEADER 본인은 수정 불가 */}
              {manageMode && isLeaderOrAdmin && m.role !== "LEADER" && (
                <>
                                    {/* ROLE 선택 */}
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginBottom: 8,
                      fontSize: 12,
                    }}
                  >
                    역할 (ROLE)
                    <select
                      value={m.draftRole}
                      onChange={(e) => {
                        const newRole = e.target.value as Role;
                        setMembers((prev) =>
                          prev.map((x) =>
                            x.id === m.id
                              ? { ...x, draftRole: newRole, dirty: true }
                              : x,
                          ),
                        );
                      }}
                      style={{
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="WRITER">WRITER</option>
                      <option value="READER">READER</option>
                    </select>
                  </label>

                  {/* TIER 선택 */}
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginBottom: 12,
                      fontSize: 12,
                    }}
                  >
                    티어 (TIER)
                    <select
                      value={m.draftTier}
                      onChange={(e) => {
                        const newTier = e.target.value as Tier;
                        setMembers((prev) =>
                          prev.map((x) =>
                            x.id === m.id
                              ? { ...x, draftTier: newTier, dirty: true }
                              : x,
                          ),
                        );
                      }}
                      style={{
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="JUNIOR">JUNIOR</option>
                      <option value="SENIOR">SENIOR</option>
                      <option value="MANAGER">MANAGER</option>
                    </select>
                  </label>

                  {/* 버튼 */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => updateMember(m.id)}
                      disabled={!m.dirty}
                      style={{
                        padding: "6px 12px",
                        background: m.dirty ? "#0f172a" : "#9ca3af",
                        color: "white",
                        borderRadius: 999,
                        fontSize: 12,
                        cursor: m.dirty ? "pointer" : "default",
                      }}
                    >
                      저장
                    </button>

                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#b91c1c",
                        color: "white",
                        borderRadius: 999,
                        fontSize: 12,
                      }}
                    >
                      내보내기
                    </button>
                  </div>
                </>
              )}

              {/* 관리 모드 + LEADER 멤버 카드일 때 안내 */}
              {manageMode && m.role === "LEADER" && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  리더 계정은 이 페이지에서 변경하거나 내보낼 수 없습니다.
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
