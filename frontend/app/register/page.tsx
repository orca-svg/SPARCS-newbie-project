"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

interface RegisterResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
      });

      // 회원가입 성공 후 로그인 페이지로 이동
      router.push("/login");
    } catch (err: any) {
      setError(err.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">회원가입</h1>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              이메일
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="auth-label">
              이름
              <input
                type="text"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p className="auth-footer">
            이미 계정이 있나요?{" "}
            <a href="/login" className="auth-link">
              로그인하기
            </a>
          </p>
        </div>
      </div>
  );
}
