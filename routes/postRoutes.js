const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, postController.getPosts);
router.post("/", authMiddleware, postController.createPost);
router.get("/:postId", authMiddleware, postController.getPost);
router.put("/:postId", authMiddleware, postController.editPost);
router.delete("/:postId", authMiddleware, postController.deletePost);

router.get("/:postId/comments", authMiddleware, commentController.getComments);
router.post(
  "/:postId/comments",
  authMiddleware,
  commentController.createComment
);
router.put(
  "/comments/:commentId",
  authMiddleware,
  commentController.editComment
);
router.delete(
  "/comments/:commentId",
  authMiddleware,
  commentController.deleteComment
);

router.post("/:postId/rate", authMiddleware, postController.ratePost);
router.delete("/:postId/rate", authMiddleware, postController.deleteRating);

module.exports = router;
