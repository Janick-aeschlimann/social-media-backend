const db = require("../db");

exports.getPosts = async (req, res) => {
  var posts = await db.getAll("posts");
  posts = await Promise.all(
    posts.map(async (post) => {
      const medialinks = await db.query(
        "SELECT * FROM medialinks WHERE postId = ?",
        [post.postId]
      );
      const user = await db.query("SELECT * FROM users WHERE userId = ?", [
        post.userId,
      ]);
      return {
        postId: post.postId,
        user: {
          userId: user[0].userId,
          username: user[0].username,
          displayName: user[0].displayName,
        },
        content: post.content,
        medialinks: medialinks,
      };
    })
  );
  res.send(posts);
};

exports.getPost = async (req, res) => {
  const postId = req.params.postId;

  const posts = await db.query("SELECT * FROM posts WHERE postId = ?", [
    postId,
  ]);
  if (posts[0]) {
    const post = posts[0];
    const medialinks = await db.query(
      "SELECT * FROM medialinks WHERE postId = ?",
      [post.postId]
    );
    const user = await db.query("SELECT * FROM users WHERE userId = ?", [
      post.userId,
    ]);
    res.send({
      postId: post.postId,
      user: {
        userId: user[0].userId,
        username: user[0].username,
        displayName: user[0].displayName,
      },
      content: post.content,
      medialinks: medialinks,
    });
  } else {
    res.status(404).send("post not found");
  }
};

exports.createPost = async (req, res) => {
  const { content, medialinks } = req.body;
  const user = req.user;
  if ((content, medialinks) != undefined) {
    const response = await db.insert("posts", {
      userId: user.userId,
      content: content,
    });
    if (response[0]) {
      if (medialinks[0]) {
        medialinks.forEach(async (element) => {
          await db.insert("medialinks", {
            source: element.source,
            url: element.url,
            postId: response[0].insertId,
          });
        });
      }
      res.send("success");
    }
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

exports.ratePost = async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.userId;
  const { isPositive } = req.body;

  const ratings = await db.query(
    "SELECT * FROM ratings WHERE userId = ? AND postId = ?",
    [userId, postId]
  );

  if (ratings[0]) {
    await db.query(
      "UPDATE ratings SET rating = ? WHERE userId = ? AND postId = ?",
      [isPositive ? 1 : 0],
      userId,
      postId
    );
    res.send("success");
  } else {
    await db.insert("ratings", {
      userId: userId,
      postId: postId,
      rating: isPositive ? 1 : 0,
    });
    res.send("success");
  }
};
