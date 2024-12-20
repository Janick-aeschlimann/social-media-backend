const db = require("../db");

exports.getPosts = async (req, res) => {
  const page = req.params.page;
  var posts = await db.query("SELECT * FROM posts LIMIT 10 OFFSET ?", [
    page * 10,
  ]);
  const total = await db.query("SELECT COUNT(postId) as count FROM posts");
  const totalPages = Math.ceil(total[0].count / 10);

  if (page) {
    posts = await Promise.all(
      posts.map(async (post) => {
        const medialinks = await db.query(
          "SELECT * FROM medialinks WHERE postId = ?",
          [post.postId]
        );
        const user = await db.query("SELECT * FROM users WHERE userId = ?", [
          post.userId,
        ]);
        const likes = await db.query(
          "SELECT COUNT(ratingId) as likes FROM ratings WHERE postId = ? AND rating = 1",
          [post.postId]
        );
        const dislikes = await db.query(
          "SELECT COUNT(ratingId) as dislikes FROM ratings WHERE postId = ? AND rating = 0",
          [post.postId]
        );
        const rating = await db.query(
          "SELECT rating FROM ratings WHERE postId = ? AND userId = ?",
          [post.postId, req.user.userId]
        );
        const saves = await db.query(
          "SELECT * FROM saves WHERE postId = ? AND userId = ?",
          [post.postId, req.user.userId]
        );
        return {
          postId: post.postId,
          user: {
            userId: user[0].userId,
            username: user[0].username,
            displayName: user[0].displayName,
          },
          content: post.content,
          likes: likes[0].likes,
          dislikes: dislikes[0].dislikes,
          rating: rating[0] ? rating[0].rating : -1,
          saved: saves[0] ? true : false,
          medialinks: medialinks,
        };
      })
    );
    res.send({
      status: "success",
      response: { totalPages: totalPages, page: Number(page), results: posts },
    });
  } else {
    res.status(400).send({ status: "error", response: "please specify page" });
  }
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

    const likes = await db.query(
      "SELECT COUNT(ratingId) as likes FROM ratings WHERE postId = ? AND rating = 1",
      [post.postId]
    );
    const dislikes = await db.query(
      "SELECT COUNT(ratingId) as dislikes FROM ratings WHERE postId = ? AND rating = 0",
      [post.postId]
    );
    const rating = await db.query(
      "SELECT rating FROM ratings WHERE postId = ? AND userId = ?",
      [post.postId, req.user.userId]
    );
    const saves = await db.query(
      "SELECT * FROM saves WHERE postId = ? AND userId = ?",
      [post.postId, req.user.userId]
    );
    res.send({
      status: "success",
      response: {
        postId: post.postId,
        user: {
          userId: user[0].userId,
          username: user[0].username,
          displayName: user[0].displayName,
        },
        likes: likes[0].likes,
        dislikes: dislikes[0].dislikes,
        rating: rating[0] ? rating[0].rating : -1,
        content: post.content,
        saved: saves[0] ? true : false,
        medialinks: medialinks,
      },
    });
  } else {
    res.status(404).send({ status: "error", response: "post not found" });
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
      res.send({ status: "success" });
    }
  } else {
    res
      .status(400)
      .send({ status: "error", response: "please specify content" });
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
        res.send({ status: "success" });
      } else {
        res.status(403).send({ status: "error", response: "Forbidden" });
      }
    } else {
      res.status(404).send({ status: "error", response: "post not found" });
    }
  } else {
    res
      .status(400)
      .send({ status: "error", response: "please specify content" });
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
      res.send({ status: "success" });
    } else {
      res.status(403).send({ status: "error", response: "Forbidden" });
    }
  } else {
    res.status(404).send({ status: "error", response: "post not found" });
  }
};

exports.ratePost = async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.userId;
  const { isPositive } = req.body;

  if (isPositive == undefined) {
    res.send({ status: "error", response: "please specify isPositive" });
  } else {
    const ratings = await db.query(
      "SELECT * FROM ratings WHERE userId = ? AND postId = ?",
      [userId, postId]
    );

    if (ratings[0]) {
      await db.query(
        "UPDATE ratings SET rating = ? WHERE userId = ? AND postId = ?",
        [isPositive == true ? 1 : 0, userId, postId]
      );
      res.send({ status: "success" });
    } else {
      await db.insert("ratings", {
        userId: userId,
        postId: postId,
        rating: isPositive ? 1 : 0,
      });
      res.send({ status: "success" });
    }
  }
};

exports.deleteRating = async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.userId;

  const ratings = await db.query(
    "SELECT * FROM ratings WHERE userId = ? AND postId = ?",
    [userId, postId]
  );

  if (ratings[0]) {
    await db.query("DELETE FROM ratings WHERE userId = ? AND postId = ?", [
      userId,
      postId,
    ]);
    res.send({ status: "success" });
  } else {
    res.status(404).send({ status: "error", response: "rating not found" });
  }
};

exports.savePost = async (req, res) => {
  const userId = req.user.userId;
  const postId = req.params.postId;

  const saves = await db.query(
    "SELECT * FROM saves WHERE userId = ? AND postId = ?",
    [userId, postId]
  );

  if (saves[0]) {
    res.status(409).send({ status: "error", response: "post already saved" });
  } else {
    await db.insert("saves", { userId: userId, postId: postId });
    res.send({ status: "success" });
  }
};

exports.unsavePost = async (req, res) => {
  const userId = req.user.userId;
  const postId = req.params.postId;

  const saves = await db.query(
    "SELECT * FROM saves WHERE userId = ? AND postId = ?",
    [userId, postId]
  );

  if (saves[0]) {
    await db.query("DELETE FROM saves WHERE userId = ? AND postId = ?", [
      userId,
      postId,
    ]);
    res.send({ status: "success" });
  } else {
    res.status(404).send({ status: "error", response: "post not saved" });
  }
};
