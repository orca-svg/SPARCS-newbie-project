// frontend/lib/api.ts

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

/**
 * 기본 API 요청 함수 (토큰 필요 없음)
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `API Error: ${res.status}`;
    try {
      const body = (await res.json()) as any;
      if (body?.message) message = body.message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

/**
 * 인증 토큰을 포함한 요청 함수 (로그인 필요)
 */
export async function authApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // 브라우저 환경에서만 localStorage 사용 가능
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `API Error: ${res.status}`;
    try {
      const body = (await res.json()) as any;
      if (body?.message) message = body.message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}
