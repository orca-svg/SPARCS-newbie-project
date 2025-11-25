"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";

interface PostListItem {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  authorName: string;
  visibility: "ALL" | "JUNIOR" | "SENIOR" | "MANAGER";
  authorTier: "JUNIOR" | "SENIOR" | "MANAGER" | null;
  commentCount: number;
  isNotice: boolean;
}

type SortOption = "latest" | "oldest" | "mostViewed";

interface PostListResponse {
  posts: PostListItem[];
  pagination: {
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
}

export default function ClubPostsPage() {
  const params = useParams<{ clubId: string }>();
  const router = useRouter();
  const clubId = Number(params.clubId);

  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 새 글 작성용 상태
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isNotice, setIsNotice] = useState(false);

  // 🔍 검색/정렬/페이징 상태
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("latest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const prettyTier = (tier: PostListItem["authorTier"]) => {
    if (!tier) return "";
    if (tier === "JUNIOR") return "Junior";
    if (tier === "SENIOR") return "Senior";
    if (tier === "MANAGER") return "Manager";
    return tier;
  };

  const isNewPost = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const diffMs = Date.now() - created;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    return diffMs <= ONE_DAY;
  };

  const fetchPosts = async () => {
    if (Number.isNaN(clubId)) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const searchParams = new URLSearchParams({
        page: String(page),
        pageSize: "10",
        sort,
        q: query,
      });

      const data = await authApiRequest<PostListResponse>(
        `/clubs/${clubId}/posts?${searchParams.toString()}`,
      );

      setPosts(data.posts ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (e: any) {
      setErrorMsg(e.message ?? "게시글 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // clubId / page / sort / query 가 바뀔 때마다 목록 다시 조회
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, page, sort, query]);

  const handleCreate = async () => {
    if (!title.trim()) {
      alert("제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력해 주세요.");
      return;
    }

    try {
      const res = await authApiRequest<{ post: any }>(`/clubs/${clubId}/posts`, {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          visibility: "ALL", // 기본값
          isNotice,
        }),
      });

      setTitle("");
      setContent("");
      setCreating(false);
      // 새 글 작성 후 1페이지부터 다시 보도록
      setPage(1);
      router.push(`/dashboard/clubs/${clubId}/posts/${res.post.id}`);
    } catch (e: any) {
      alert(e.message ?? "게시글 작성에 실패했습니다.");
    }
  };

  if (Number.isNaN(clubId)) {
    return <div className="dashboard-main">잘못된 클럽 주소입니다.</div>;
  }

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      {/* 상단 헤더 */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <h1 className="page-title">게시판</h1>

        {/* 🔍 검색 & 정렬 & 버튼 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="검색(제목/내용)"
            value={query}
            onChange={(e) => {
              setPage(1); // 검색어 바뀌면 첫 페이지로
              setQuery(e.target.value);
            }}
            style={{
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              minWidth: 180,
            }}
          />

          <select
            value={sort}
            onChange={(e) => {
              setPage(1); // 정렬 바뀌면 첫 페이지로
              setSort(e.target.value as SortOption);
            }}
            style={{
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#fff",
            }}
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된 순</option>
            <option value="mostViewed">조회수순</option>
          </select>

          <button
            type="button"
            onClick={() => setCreating((prev) => !prev)}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #0f172a",
              background: creating ? "#fff" : "#0f172a",
              color: creating ? "#0f172a" : "#fff",
            }}
          >
            {creating ? "작성 폼 닫기" : "새 글 작성"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/dashboard/clubs/${clubId}`)}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            동아리 대시보드
          </button>
        </div>
      </div>

      {/* 새 글 작성 폼 */}
      {creating && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <textarea
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                resize: "vertical",
              }}
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={isNotice}
              onChange={(e) => setIsNotice(e.target.checked)}
            />
            이 글을 공지로 상단 고정하기
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setTitle("");
                setContent("");
                setCreating(false);
              }}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCreate}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
              }}
            >
              등록
            </button>
          </div>
        </div>
      )}

      {/* 목록 영역 */}
      {loading && <div>불러오는 중...</div>}

      {errorMsg && (
        <div style={{ color: "#ef4444", fontSize: 13 }}>{errorMsg}</div>
      )}

      {!loading && !errorMsg && posts.length === 0 && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          아직 게시글이 없습니다. 첫 글을 작성해 보세요.
        </div>
      )}

      <ul
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {posts.map((post) => {
          const isNew = isNewPost(post.createdAt);

          return (
            <li
              key={post.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() =>
                router.push(`/dashboard/clubs/${clubId}/posts/${post.id}`)
              }
            >
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {post.isNotice && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 600,
                      }}
                    >
                      공지
                    </span>
                  )}
                  <span
                    style={{
                      fontWeight: isNew ? 700 : 500,
                      fontSize: 14,
                    }}
                  >
                    {post.title}
                  </span>
                  {isNew && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      (new!)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    marginTop: 2,
                  }}
                >
                  {post.authorName}
                  {post.authorTier && ` (${prettyTier(post.authorTier)})`} ·{" "}
                  {new Date(post.createdAt).toLocaleString()} · 댓글{" "}
                  {post.commentCount}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#4b5563",
                  minWidth: 60,
                  textAlign: "right",
                }}
              >
                조회 {post.viewCount}
              </div>
            </li>
          );
        })}
      </ul>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: page <= 1 ? "#f9fafb" : "#fff",
              cursor: page <= 1 ? "default" : "pointer",
            }}
          >
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((p) => (p < totalPages ? p + 1 : p))
            }
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: page >= totalPages ? "#f9fafb" : "#fff",
              cursor: page >= totalPages ? "default" : "pointer",
            }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
