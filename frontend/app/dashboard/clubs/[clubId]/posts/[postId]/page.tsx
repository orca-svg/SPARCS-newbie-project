"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";

interface PostDetail {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  visibility: "ALL" | "JUNIOR" | "SENIOR" | "MANAGER";
  clubId: number;
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
  const hasFetched = useRef(false);
  const params = useParams<{ clubId: string; postId: string }>();
  const router = useRouter();

  const clubId = Number(params.clubId);
  const postId = Number(params.postId);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const isNew = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff <= 24 * 60 * 60 * 1000; // 24시간 계산
  };

  const prettyTier = (  tier: "JUNIOR" | "SENIOR" | "MANAGER" | null | undefined,
) => {
  if (!tier) return "";
  if (tier === "JUNIOR") return "Junior";
  if (tier === "SENIOR") return "Senior";
  if (tier === "MANAGER") return "Manager";
  return tier;
};


  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await authApiRequest<{ post: PostDetail }>(
        `/posts/${postId}`
      );
      setPost(res.post);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await authApiRequest<{ comments: CommentItem[] }>(
        `/posts/${postId}/comments`
      );
      setComments(data.comments ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return; 
    hasFetched.current = true;

    fetchDetail();
    fetchComments();
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return alert("댓글 내용을 입력해주세요");

    try {
      await authApiRequest(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment }),
      });

      setNewComment("");
      await fetchComments();
    } catch (e: any) {
      alert(e.message ?? "댓글 작성 실패");
    }
  };

  if (loading) return <div style={{ padding: 24 }}>불러오는 중...</div>;
  if (!post) return <div style={{ padding: 24 }}>게시글을 찾을 수 없습니다.</div>;

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
          {new Date(post.createdAt).toLocaleString()} · 조회{" "}
          {post.viewCount}
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push(`/dashboard/clubs/${clubId}/posts`)}
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
    </div>

      {/* 본문 */}
      <div
        style={{
          padding: "16px 12px",
          background: "#fff",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          whiteSpace: "pre-wrap",
          marginBottom: 24,
        }}
      >
        {post.content}
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
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            resize: "none",
            marginBottom: 8,
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            background: "#0f172a",
            color: "white",
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
