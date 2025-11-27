"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authApiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type ClubMemberRole = "LEADER" | "WRITER" | "READER";

interface MyClub {
  id: number;
  role: ClubMemberRole;
}

export default function NewSchedulePage() {
  const router = useRouter();
  const params = useParams<{ clubId: string }>();
  const clubId = Number(params.clubId);
  const { user } = useAuth({ required: true });

  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [content, setContent] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null); // null: 체크중

  // 🔐 역할 체크: LEADER / WRITER 만 일정 생성 가능
  useEffect(() => {
    if (!clubId || Number.isNaN(clubId)) return;

    const checkPermission = async () => {
      try {
        const res = await authApiRequest<{ clubs: MyClub[] }>("/clubs/my");
        const membership = res.clubs.find((c) => c.id === clubId);

        if (!membership || membership.role === "READER") {
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      } catch (e) {
        // 내 클럽 목록을 못 불러오면 일단 막아두기
        setAllowed(false);
      }
    };

    checkPermission();
  }, [clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || Number.isNaN(clubId)) return;

    // 간단한 검증
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!startDate || !endDate) {
      setError("시작일과 종료일을 모두 선택해 주세요.");
      return;
    }
    if (startDate > endDate) {
      setError("시작일은 종료일보다 이후일 수 없습니다.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await authApiRequest<{ schedule: unknown }>(
        `/clubs/${clubId}/schedules`,
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            startAt: startDate,        // YYYY-MM-DD string
            endAt: endDate,            // YYYY-MM-DD string
            content: content.trim() || undefined,
          }),
        },
      );

      // 성공 시 클럽 메인으로 이동 (캘린더에서 바로 보이도록)
      router.push(`/dashboard/clubs/${clubId}`);
    } catch (e: any) {
      setError(e?.message ?? "일정 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // 권한 체크 중
  if (allowed === null) {
    return (
      <div className="dashboard-main" style={{ padding: 32 }}>
        <h1 className="page-title">새 일정 추가</h1>
        <p style={{ marginTop: 12, fontSize: 14 }}>권한을 확인하는 중입니다...</p>
      </div>
    );
  }

  // READER 이거나 멤버가 아닌 경우
  if (allowed === false) {
    return (
      <div className="dashboard-main" style={{ padding: 32 }}>
        <h1 className="page-title">새 일정 추가</h1>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          일정 생성은 이 동아리의 <b>리더(LEADER)</b> 또는{" "}
          <b>작성자(WRITER)</b>만 할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/clubs/${clubId}`)}
          style={{
            marginTop: 16,
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #9ca3af",
            background: "#f3f4f6",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          동아리 페이지로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-main" style={{ padding: 32 }}>
      <h1 className="page-title">새 일정 추가</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 24,
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* 제목 */}
        <div>
          <label className="field-label" htmlFor="title">
            제목
          </label>
          <input
            id="title"
            className="field-input"
            type="text"
            placeholder="예) 정기 회의"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 시작일 / 종료일 */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="startDate">
              시작일
            </label>
            <input
              id="startDate"
              type="date"
              className="field-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor="endDate">
              종료일
            </label>
            <input
              id="endDate"
              type="date"
              className="field-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* 내용 */}
        <div>
          <label className="field-label" htmlFor="content">
            내용 (선택)
          </label>
          <textarea
            id="content"
            className="field-input"
            style={{ minHeight: 90, resize: "vertical" }}
            placeholder="일정에 대한 설명을 적어 주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>
        )}

        {/* 버튼 영역 */}
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? "생성 중..." : "일정 생성"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
