const db = require("../db");

exports.getPosts = async (req, res) => {
  const posts = await db.getAll("posts");
  res.send(posts);
};

exports.getPost = async (req, res) => {
  const postId = req.params.postId;

  const posts = await db.query("SELECT * FROM posts WHERE postId = ?", [
    postId,
  ]);
  if (posts[0]) {
    res.send(posts[0]);
  } else {
    res.status(404).send("post not found");
  }
};

exports.createPost = async (req, res) => {
  const { content } = req.body;
  const user = req.user;
  if (content) {
    await db.insert("posts", {
      userId: user.userId,
      content: content,
    });
    res.send("success");
  } else {
    res.status(400).send("please specify content");
  }
};

exports.editPost = async (req, res) => {
  const postId = req.params.postId;
  const { content } = req.body;

  if (content) {
    const posts = await db.query("SELECT * FROM posts WHERE postId = ?", [
      postId,
    ]);
    if (posts[0]) {
      if (posts[0].userId == req.user.userId) {
        db.query("UPDATE posts SET content = ? WHERE postId = ?", [
          content,
          postId,
        ]);
        res.send("success");
      } else {
        res.status(403).send("Forbidden");
      }
    } else {
      res.status(404).send("post not found");
    }
  } else {
    res.status(400).send("please specify content");
  }
};

exports.deletePost = async (req, res) => {
  const postId = req.params.postId;

  const posts = await db.query("SELECT * FROM posts WHERE postId = ?", [
    postId,
  ]);
  if (posts[0]) {
    if (posts[0].userId == req.user.userId) {
      db.query("DELETE FROM posts WHERE postId = ?", [postId]);
      res.send("success");
    } else {
      res.status(403).send("Forbidden");
    }
  } else {
    res.status(404).send("post not found");
  }
};
