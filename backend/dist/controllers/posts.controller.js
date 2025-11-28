import PostService from "../services/posts.service.js";
export class PostController {
    // GET /api/clubs/:clubId/posts
    static async listByClub(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "로그인이 필요합니다." });
            }
            const clubId = Number(req.params.clubId);
            if (Number.isNaN(clubId)) {
                return res.status(400).json({ message: "유효하지 않은 clubId입니다." });
            }
            const page = Math.max(Number(req.query.page ?? "1") || 1, 1);
            const pageSizeRaw = Number(req.query.pageSize ?? "10") || 10;
            const pageSize = Math.min(Math.max(pageSizeRaw, 1), 50);
            const sortParam = req.query.sort ?? "latest";
            const allowedSort = ["latest", "oldest", "mostViewed"];
            const sort = allowedSort.includes(sortParam)
                ? sortParam
                : "latest";
            const q = req.query.q ?? "";
            const onlyNotice = req.query.onlyNotice === "true"; // ✅
            const { items, pagination } = await PostService.listByClub(clubId, req.user.userId, {
                page,
                pageSize,
                sort,
                query: q.trim() || undefined,
                onlyNotice,
            });
            return res.json({ posts: items, pagination });
        }
        catch (e) {
            if (e.message === "해당 동아리의 멤버만 접근할 수 있습니다." ||
                e.message === "이 동아리 회원만 접근 가능합니다.") {
                return res.status(403).json({ message: e.message });
            }
            console.error(e);
            return res
                .status(500)
                .json({ message: "게시글 목록을 가져오지 못했습니다." });
        }
    }
    // GET /api/posts/:postId
    static async getOne(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "로그인이 필요합니다." });
            }
            const postId = Number(req.params.postId);
            if (Number.isNaN(postId)) {
                return res.status(400).json({ message: "유효하지 않은 postId입니다." });
            }
            const post = await PostService.getPost(postId, req.user.userId);
            return res.json({ post });
        }
        catch (e) {
            return res
                .status(400)
                .json({ message: e.message ?? "게시글을 가져오지 못했습니다." });
        }
    }
    // POST /api/clubs/:clubId/posts
    static async create(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "로그인이 필요합니다." });
            }
            const clubId = Number(req.params.clubId);
            if (Number.isNaN(clubId)) {
                return res.status(400).json({ message: "유효하지 않은 clubId입니다." });
            }
            const { title, content, visibility, isNotice } = req.body ?? {};
            if (!title || !content) {
                return res
                    .status(400)
                    .json({ message: "title과 content는 필수입니다." });
            }
            const post = await PostService.createPost(clubId, req.user.userId, {
                title,
                content,
                visibility,
                isNotice: !!isNotice,
            });
            return res.status(201).json({ post });
        }
        catch (e) {
            return res
                .status(400)
                .json({ message: e.message ?? "게시글 생성에 실패했습니다." });
        }
    }
    // GET /api/posts/:postId/comments
    static async listComments(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "로그인이 필요합니다." });
            }
            const postId = Number(req.params.postId);
            if (Number.isNaN(postId)) {
                return res.status(400).json({ message: "유효하지 않은 postId입니다." });
            }
            const comments = await PostService.listComments(postId, req.user.userId);
            return res.json({ comments });
        }
        catch (e) {
            return res
                .status(400)
                .json({ message: e.message ?? "댓글 목록을 가져오지 못했습니다." });
        }
    }
    // POST /api/posts/:postId/comments
    static async createComment(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "로그인이 필요합니다." });
            }
            const postId = Number(req.params.postId);
            if (Number.isNaN(postId)) {
                return res.status(400).json({ message: "유효하지 않은 postId입니다." });
            }
            const { content } = req.body ?? {};
            if (!content) {
                return res.status(400).json({ message: "content는 필수입니다." });
            }
            const comment = await PostService.createComment({
                postId,
                userId: req.user.userId,
                content,
            });
            return res.status(201).json({ comment });
        }
        catch (e) {
            return res
                .status(400)
                .json({ message: e.message ?? "댓글 작성에 실패했습니다." });
        }
    }
    static async update(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "로그인이 필요합니다." });
            }
            const clubId = Number(req.params.clubId);
            const postId = Number(req.params.postId);
            const { title, content, visibility, isNotice } = req.body;
            const updated = await PostService.updatePost(postId, req.user.userId, clubId, {
                title,
                content,
                visibility,
                isNotice,
            });
            return res.json({ post: updated });
        }
        catch (e) {
            console.error(e);
            return res
                .status(400)
                .json({ message: e.message ?? "게시글 수정 중 오류가 발생했습니다." });
        }
    }
    static async remove(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "로그인이 필요합니다." });
            }
            const clubId = Number(req.params.clubId);
            const postId = Number(req.params.postId);
            const result = await PostService.deletePost({
                postId,
                clubId,
                userId: req.user.userId,
            });
            return res.json(result);
        }
        catch (e) {
            console.error(e);
            return res
                .status(400)
                .json({ message: e.message ?? "게시글 삭제 중 오류가 발생했습니다." });
        }
    }
}
export default PostController;
