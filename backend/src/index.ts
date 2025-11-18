import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
const PORT = 4000;

// JSON body 파싱
app.use(express.json());

// CORS 허용 (Next.js 프론트(3000)에서 호출할 수 있도록)
app.use(cors());

// 테스트용 API (나중에 게시판용 API로 바꾸면 됩니다)
app.get("/api/posts", (req: Request, res: Response) => {
  const samplePosts = [
    { id: 1, title: "첫 번째 글", content: "내용입니다." },
    { id: 2, title: "두 번째 글", content: "게시판 연습 중입니다." },
  ];
  res.json(samplePosts);
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
