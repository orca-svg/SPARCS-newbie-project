"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";


interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // 일단 로컬스토리지에 토큰/이름 저장
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.user.name);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">로그인</h1>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              이메일
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="auth-label">
              비밀번호
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="auth-footer">
            아직 계정이 없나요?{" "}
            <a href="/register" className="auth-link">
              회원가입하기
            </a>
          </p>
        </div>
      </div>
  );
}
