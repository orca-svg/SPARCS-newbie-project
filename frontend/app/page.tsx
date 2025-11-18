"use client";

import { useEffect, useState } from "react";

type Post = {
  id: number;
  title: string;
  content: string;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/api/posts")
      .then((res) => res.json())
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("API 호출 에러:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>불러오는 중...</div>;
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>게시판 테스트</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id} style={{ marginBottom: 16 }}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
