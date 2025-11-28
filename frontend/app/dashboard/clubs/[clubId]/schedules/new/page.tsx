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

  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [content, setContent] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  //  WRITER / LEADER 권한 확인
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
      } catch {
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

  // 🔸 여기서부터 ISO 문자열로 변환
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    setError("날짜 형식이 올바르지 않습니다.");
    return;
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  setError(null);
  setSubmitting(true);

  try {
    await authApiRequest<{ schedule: unknown }>(
      `/clubs/${clubId}/schedules`,
      {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          startAt: startIso,   // ✅ ISO 문자열
          endAt: endIso,       // ✅ ISO 문자열
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


  // 로딩 / 권한 없음 UI
  if (allowed === null) {
    return (
      <div className="dashboard-main" style={{ padding: 24 }}>
        <h1 className="page-title">새 일정 추가</h1>
        <p style={{ marginTop: 10 }}>권한을 확인하는 중입니다...</p>
      </div>
    );
  }

    if (allowed === false) {
    return (
      <div className="dashboard-main" style={{ padding: 24 }}>
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
    <div style={{ padding: 24 }}>
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
        <h1 className="page-title">새 일정 추가</h1>

        <button
          type="button"
          onClick={() => router.push(`/dashboard/clubs/${clubId}`)}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            cursor: "pointer",
          }}
        >
          동아리 대시보드
        </button>
      </div>

      {/* 📌 일정 작성 폼 카드 (화면 너비에 맞게 넓게 + 각 항목 레이블 표시) */}
      <div
        style={{
          margin: "0 auto 20px",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          width: "100%",
          maxWidth: 960, // 👉 좌우 더 넓게
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* 제목 */}
          <div>
            <label
              htmlFor="schedule-title"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              제목
            </label>
            <input
              id="schedule-title"
              type="text"
              placeholder="예) 정기 회의"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          {/* 시작일 / 종료일 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "1 1 200px" }}>
              <label
                htmlFor="schedule-start"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                시작일
              </label>
              <input
                id="schedule-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            <div style={{ flex: "1 1 200px" }}>
              <label
                htmlFor="schedule-end"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                종료일
              </label>
              <input
                id="schedule-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label
              htmlFor="schedule-content"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              내용 (선택)
            </label>
            <textarea
              id="schedule-content"
              placeholder="일정에 대한 설명을 입력하세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: 8,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                resize: "vertical",
              }}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>
          )}

          {/* 버튼 영역 */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={router.back}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {submitting ? "생성 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
