"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface PostDetail {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  visibility: "ALL" | "JUNIOR" | "SENIOR" | "MANAGER";
  clubId: number;
  isNotice: boolean;
  author: {
    id: number;
    name: string;
    tier: "JUNIOR" | "SENIOR" | "MANAGER" | null;
  };
}

interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
  };
}

export default function PostDetailPage() {
  const params = useParams<{ clubId: string; postId: string }>();
  const router = useRouter();

  const clubId = Number(params.clubId);
  const postId = Number(params.postId);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isNotice, setIsNotice] = useState(false);


  // dev 모드에서 useEffect 두 번 실행되는 것 방지 (조회수 2 증가 방지)
  const hasFetched = useRef(false);

  // 현재 로그인 유저 정보는 useAuth 훅에서만 가져온다
  const { user: me } = useAuth();

  // 내가 작성자인지 여부
  const canEdit = me && post ? me.id === post.author.id : false;

  const isNew = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff <= 24 * 60 * 60 * 1000; // 24시간 이내면 new!
  };

  const prettyTier = (
    tier: "JUNIOR" | "SENIOR" | "MANAGER" | null | undefined,
  ) => {
    if (!tier) return "";
    if (tier === "JUNIOR") return "Junior";
    if (tier === "SENIOR") return "Senior";
    if (tier === "MANAGER") return "Manager";
    return tier;
  };

  // 게시글 상세 (조회수 증가 포함)
  const fetchDetail = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApiRequest<{ post: PostDetail }>(
        `/clubs/${clubId}/posts/${postId}`,
      );
      setPost(res.post);
      setEditTitle(res.post.title);
      setEditContent(res.post.content);
      setIsNotice(res.post.isNotice); 
    } catch (e: any) {
      setErrorMsg(e.message ?? "게시글을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 댓글 목록
  const fetchComments = async () => {
    try {
      const res = await authApiRequest<{ comments: CommentItem[] }>(
        `/posts/${postId}/comments`,
      );
      setComments(res.comments ?? []);
    } catch (e) {
      console.error("댓글 불러오기 실패:", e);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    if (!Number.isFinite(clubId) || !Number.isFinite(postId)) {
      setErrorMsg("잘못된 게시글 주소입니다.");
      setLoading(false);
      return;
    }

    fetchDetail();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, postId]);

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      await authApiRequest(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment("");
      await fetchComments();
    } catch (e: any) {
      alert(e.message ?? "댓글 작성에 실패했습니다.");
    }
  };

  // 게시글 수정
  const handleUpdate = async () => {
    if (!post) return;

    if (!editTitle.trim()) {
      alert("제목을 입력해 주세요.");
      return;
    }
    if (!editContent.trim()) {
      alert("내용을 입력해 주세요.");
      return;
    }

    try {
      const res = await authApiRequest<{ post: PostDetail }>(
        `/clubs/${clubId}/posts/${postId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: editTitle,
            content: editContent,
            visibility: post.visibility,
            isNotice,
          }),
        },
      );
      setPost(res.post);
      setIsEditing(false);
    } catch (e: any) {
      alert(e.message ?? "게시글 수정에 실패했습니다.");
    } 
  };

  // 게시글 삭제
  const handleDelete = async () => {
    if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;

    try {
      await authApiRequest(`/clubs/${clubId}/posts/${postId}`, {
        method: "DELETE",
      });
      alert("삭제되었습니다.");
      router.push(`/dashboard/clubs/${clubId}/posts`);
    } catch (e: any) {
      alert(e.message ?? "게시글 삭제에 실패했습니다.");
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>불러오는 중...</div>;
  }

  if (errorMsg) {
    return <div style={{ padding: 24 }}>{errorMsg}</div>;
  }

  if (!post) {
    return <div style={{ padding: 24 }}>게시글을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="dashboard-main" style={{ padding: 24 }}>
      {/* 상단 헤더 */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            {post.title}
            {isNew(post.createdAt) && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 13,
                  color: "#dc2626",
                  fontWeight: 700,
                }}
              >
                (new!)
              </span>
            )}
          </h1>
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            {post.author.name}
            {post.author.tier && ` (${prettyTier(post.author.tier)})`} ·{" "}
            {new Date(post.createdAt).toLocaleString()} · 조회 {post.viewCount}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/clubs/${clubId}/posts`)
            }
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            목록으로
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #0f172a",
                  background: isEditing ? "#fff" : "#0f172a",
                  color: isEditing ? "#0f172a" : "#fff",
                }}
              >
                {isEditing ? "수정 취소" : "수정"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #ef4444",
                  background: "#fef2f2",
                  color: "#b91c1c",
                }}
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 본문 영역: 보기 / 수정 모드 */}
      <div
        style={{
          padding: 16,
          background: "#fff",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          marginBottom: 24,
        }}
      >
        {isEditing ? (
          <>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 8,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                resize: "vertical",
              }}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                marginTop: 8,
              }}
            >
              <input
                type="checkbox"
                checked={isNotice}
                onChange={(e) => setIsNotice(e.target.checked)}
              />
              이 글을 공지로 상단 고정하기
            </label>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
            
              <button
                type="button"
                onClick={() => setIsEditing(false)}
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
                onClick={handleUpdate}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #0f172a",
                  background: "#0f172a",
                  color: "#fff",
                }}
              >
                저장
              </button>
            </div>
          </>
        ) : (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {post.content}
          </div>
        )}
      </div>

      {/* 댓글 작성 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#fff",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
        }}
      >
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="댓글을 입력하세요"
          style={{
            width: "97%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            resize: "none",
            marginBottom: 8,
          }}
        />
        <button
          type="button"
          onClick={handleSubmitComment}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            background: "#0f172a",
            color: "#fff",
            border: "none",
            fontSize: 12,
          }}
        >
          댓글 작성
        </button>
      </div>

      {/* 댓글 목록 */}
      <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {comments.map((c) => (
          <li
            key={c.id}
            style={{
              padding: 12,
              background: "#fff",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontWeight: 600 }}>{c.user.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {new Date(c.createdAt).toLocaleString()}
            </div>
            <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
              {c.content}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
