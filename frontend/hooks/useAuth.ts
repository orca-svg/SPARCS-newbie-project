"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApiRequest } from "@/lib/api";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface UseAuthOptions {
  required?: boolean; // true면 로그인 필수 페이지
}

export function useAuth(options: UseAuthOptions = {}) {
  const { required = false } = options;
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      if (required) {
        router.replace("/login");
      }
      setLoading(false);
      return;
    }

    const fetchMe = async () => {
      try {
        const data = await authApiRequest<{ user: AuthUser }>("/auth/me");
        setUser(data.user);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? "인증 정보 확인에 실패했습니다.");

        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        if (required) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [required, router]);

  return { user, loading, error };
}
