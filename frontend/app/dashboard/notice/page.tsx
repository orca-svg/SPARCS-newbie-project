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

interface NoticePost {
  id: number;
  title: string;
  createdAt: string;
  commentCount: number;
  viewCount: number;
  isNotice?: boolean;
}

interface CombinedNotice {
  id: number;
  clubId: number;
  clubName: string;
  title: string;
  createdAt: string;
  commentCount: number;
  viewCount: number;
}

const TAG_COLORS = [
  { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  { bg: "#fef9c3", text: "#854d0e", border: "#fef3c7" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  { bg: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
];


type TagColor = (typeof TAG_COLORS)[number];

type SortKey = "createdAt" | "clubName" | "viewCount";
type SortDir = "asc" | "desc";

export default function DashboardNoticePage() {
  const { user } = useAuth({ required: true });
  const router = useRouter();

  const [clubs, setClubs] = useState<MyClub[]>([]);
  const [clubColorMap, setClubColorMap] = useState<Record<number, TagColor>>(
    {},
  );

  const [notices, setNotices] = useState<CombinedNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 컨트롤 상태
  const [pageSize, setPageSize] = useState(5); // 클럽당 가져올 최대 개수
  const [selectedClubId, setSelectedClubId] = useState<number | "ALL">("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadAllNotices = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1) 내 클럽 목록
      const myClubsRes = await authApiRequest<{ clubs: MyClub[] }>(
        "/clubs/my",
      );
      const myClubs = myClubsRes.clubs ?? [];
      setClubs(myClubs);

      if (myClubs.length === 0) {
        setNotices([]);
        return;
      }

      // 태그 색상 매핑
      const colorMap: Record<number, TagColor> = {};
      myClubs.forEach((club, idx) => {
        colorMap[club.id] = TAG_COLORS[idx % TAG_COLORS.length];
      });
      setClubColorMap(colorMap);

      const baseQuery = `page=1&pageSize=${pageSize}&sort=latest&onlyNotice=true`;

      // 2) 각 클럽별 공지 병렬 요청
      const responses = await Promise.all(
        myClubs.map((club) =>
          authApiRequest<{ posts: NoticePost[] }>(
            `/clubs/${club.id}/posts?${baseQuery}`,
          ).then((res) => ({ club, posts: res.posts ?? [] })),
        ),
      );

      const merged: CombinedNotice[] = [];
      responses.forEach(({ club, posts }) => {
        posts
          .filter((p) => p.isNotice === true)
          .forEach((p) => {
            merged.push({
              id: p.id,
              clubId: club.id,
              clubName: club.name,
              title: p.title,
              createdAt: p.createdAt,
              commentCount: p.commentCount,
              viewCount: p.viewCount,
            });
          });
      });

      setNotices(merged);
    } catch (e: any) {
      setErrorMsg(e.message ?? "공지 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // 필터/검색/정렬 적용된 공지 리스트
  const filteredSortedNotices = (() => {
    let list = [...notices];

    // 1) 클럽 필터
    if (selectedClubId !== "ALL") {
      list = list.filter((n) => n.clubId === selectedClubId);
    }

    // 2) 검색 (제목)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      list = list.filter((n) =>
        n.title.toLowerCase().includes(kw),
      );
    }

    // 3) 정렬
    list.sort((a, b) => {
      let cmp = 0;

      if (sortKey === "createdAt") {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        cmp = ta - tb;
      } else if (sortKey === "clubName") {
        cmp = a.clubName.localeCompare(b.clubName, "ko");
      } else if (sortKey === "viewCount") {
        cmp = a.viewCount - b.viewCount;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  })();

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      <h1 className="page-title">모든 동아리 공지</h1>
      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
        {user?.name ?? "사용자"} 님이 가입한 모든 동아리의 공지사항을 한
        화면에서 확인하고, 동아리/키워드/정렬 기준으로 필터링할 수
        있습니다.
      </p>

      {/* 상단 컨트롤 바 */}
      <div
        style={{
          marginTop: 16,
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* 검색 */}
        <input
          type="text"
          placeholder="공지 제목 검색"
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

        {/* 클럽 필터 */}
        <select
          value={selectedClubId === "ALL" ? "ALL" : String(selectedClubId)}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedClubId(v === "ALL" ? "ALL" : Number(v));
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
          }}
        >
          <option value="ALL">모든 동아리</option>
          {clubs.map((club, idx) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
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
          <option value="createdAt">작성일</option>
          <option value="clubName">동아리명</option>
          <option value="viewCount">조회수</option>
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
          <option value="desc">내림차순 ↓</option>
          <option value="asc">오름차순 ↑</option>
        </select>

        {/* 클럽당 공지 개수 */}
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            fontSize: 12,
            marginLeft: "auto",
          }}
        >
          <option value={3}>클럽당 3개</option>
          <option value={5}>클럽당 5개</option>
          <option value={10}>클럽당 10개</option>
        </select>
      </div>

      {loading && <div>공지를 불러오는 중...</div>}

      {errorMsg && (
        <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && filteredSortedNotices.length === 0 && (
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
          조건에 맞는 공지사항이 없습니다.
        </div>
      )}

      {/* 공지 리스트 */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 720,
        }}
      >
        {filteredSortedNotices.map((n) => {
          const color = clubColorMap[n.clubId] ?? TAG_COLORS[0];

          return (
            <button
              key={`${n.clubId}-${n.id}`}
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/clubs/${n.clubId}/posts/${n.id}`,
                )
              }
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#fee2e2",
                    color: "#b91c1c",
                  }}
                >
                  공지
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: color.bg,
                    color: color.text,
                    border: `1px solid ${color.border}`,
                  }}
                >
                  {n.clubName}
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                }}
              >
                {n.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                {new Date(n.createdAt).toLocaleDateString()} · 댓글{" "}
                {n.commentCount} · 조회 {n.viewCount}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
