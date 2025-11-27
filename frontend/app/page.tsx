"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();

  // required: false → 로그인 안 돼 있어도 그냥 페이지 보여주기
  const { user, loading } = useAuth({ required: false } as any);

  // 이미 로그인된 경우 대시보드로 자동 이동
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  // 리다이렉트 직전에 깜빡임 방지용
  if (!loading && user) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f2e9", // 기존 톤과 어울리는 베이지
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* 왼쪽: 타이틀 / 설명 */}
        <section
          style={{
            flex: "1 1 300px",
            minWidth: 0,
          }}
        >
          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              margin: 0,
              marginBottom: 12,
              color: "#111827",
            }}
          >
            Club Planner
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#4b5563",
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            동아리 일정·공지·게시판·멤버 관리를 한 곳에서 관리하는
            내부 전용 플랫폼입니다.
            <br />
            캘린더, 공지, 게시판, 멤버 관리까지 한 번에 정리해 보세요.
          </p>

          <ul
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 20,
              paddingLeft: 18,
              lineHeight: 1.7,
            }}
          >
            <li>내가 가입한 동아리의 일정과 공지를 한 번에 확인</li>
            <li>리더 전용 멤버 권한 관리 및 가입 요청 승인</li>
            <li>달력형 UI 기반의 직관적인 일정 관리</li>
          </ul>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#ffffff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              로그인하기
            </button>
            <button
              type="button"
              onClick={() => router.push("/register")}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#111827",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              회원가입
            </button>
          </div>
        </section>

        {/* 오른쪽: 소개 카드 (반응형에서 아래로 내려감) */}
        <section
          style={{
            flex: "1 1 260px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: "#fdfbf5",
              borderRadius: 16,
              border: "1px solid #e5e5e5",
              padding: 20,
              boxShadow: "0 8px 16px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "#374151",
              }}
            >
              Club Planner로 할 수 있는 일
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 12,
                color: "#4b5563",
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-block",
                    width: 20,
                    textAlign: "center",
                    marginRight: 4,
                  }}
                >
                  📅
                </span>
                동아리별 일정과 다가오는 이벤트를 달력으로 확인
              </div>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    width: 20,
                    textAlign: "center",
                    marginRight: 4,
                  }}
                >
                  📢
                </span>
                공지와 게시글을 통합 대시보드에서 한 번에 확인
              </div>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    width: 20,
                    textAlign: "center",
                    marginRight: 4,
                  }}
                >
                  👥
                </span>
                리더는 멤버 권한·티어 관리와 가입 승인/거절 처리
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              이미 계정이 있으시다면 상단의{" "}
              <span style={{ fontWeight: 600, color: "#4b5563" }}>로그인하기</span> 버튼을
              눌러 대시보드로 이동하세요.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
