const { response } = require("../app");
const db = require("../db");

exports.getComments = async (req, res) => {
  const postId = req.params.postId;
  const comments = await db.query("SELECT * FROM comments WHERE postId = ?", [
    postId,
  ]);
  const response = comments.map(async (comment) => {
    const user = await db.query("SELECT * FROM users WHERE userId = ?", [
      comment.userId,
    ]);
    return {
      commentId: comment.commentId,
      user: {
        userId: user[0].userId,
        username: user[0].username,
        displayName: user[0].displayName,
      },
      postId: comment.postId,
      comment: comment.comment,
    };
  });
  res.send({ status: "success", response: response });
};

exports.createComment = async (req, res) => {
  const postId = req.params.postId;
  const { comment } = req.body;
  if (comment) {
    await db.insert("comments", {
      userId: req.user.userId,
      postId: postId,
      comment: comment,
    });
    res.send({ status: "success" });
  } else {
    res
      .status(400)
      .send({ status: "error", response: "please specify comment" });
  }
};

exports.editComment = async (req, res) => {
  const commentId = req.params.commentId;
  const { comment } = req.body;

  if (comment) {
    const comments = await db.query(
      "SELECT * FROM comments WHERE commentId = ?",
      [commentId]
    );
    if (comments[0]) {
      if (comments[0].userId == req.user.userId) {
        await db.query("UPDATE comments SET comment = ? WHERE commentId = ?", [
          comment,
          commentId,
        ]);
        res.send({ status: "success" });
      } else {
        res.status(403).send({ status: "error", response: "Forbidden" });
      }
    } else {
      res.status(404).send({ status: "error", response: "comment not found" });
    }
  } else {
    res
      .status(400)
      .send({ status: "error", response: "please specify comment" });
  }
};

exports.deleteComment = async (req, res) => {
  const commentId = req.params.commentId;

  const comments = await db.query(
    "SELECT * FROM comments WHERE commentId = ?",
    [commentId]
  );
  if (comments[0]) {
    if (comments[0].userId == req.user.userId) {
      await db.query("DELETE FROM comments WHERE commentId = ?", [commentId]);
      res.send({ status: "success" });
    } else {
      res.status(403).send({ status: "error", response: "Forbidden" });
    }
  } else {
    res.status(404).send({ status: "error", response: "comment not found" });
  }
};
