const { request } = require("../app");
const db = require("../db");

exports.getProfiles = async (req, res) => {
  const users = await db.getAll("users");
  const userId = req.user.userId;
  res.send({
    status: "success",
    response: await Promise.all(
      users.map(async (user) => {
        const friends = await db.query(
          "SELECT * FROM friends WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)",
          [userId, user.userId, user.userId, userId]
        );
        const requestsIncoming = await db.query(
          "SELECT * FROM requests WHERE (senderId = ? AND recieverId = ?)",
          [user.userId, userId]
        );
        const requestsOutgoing = await db.query(
          "SELECT * FROM requests WHERE (senderId = ? AND recieverId = ?)",
          [userId, user.userId]
        );
        var isFriend = false;
        if (friends[0]) {
          isFriend = true;
        }
        return {
          userId: user.userId,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          isFriend: isFriend,
          isOwn: userId == user.userId,
          requestOutgoing: requestsOutgoing[0] ? true : false,
          requestIncoming: requestsIncoming[0] ? true : false,
        };
      })
    ),
  });
};

exports.getProfile = async (req, res) => {
  const userId = req.user.userId;

  const users = await db.query("SELECT * FROM users WHERE userId = ?", [
    req.params.userId,
  ]);

  if (users[0]) {
    const user = users[0];
    const friends = await db.query(
      "SELECT * FROM friends WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)",
      [userId, user.userId, user.userId, userId]
    );

    const requestsIncoming = await db.query(
      "SELECT * FROM requests WHERE (senderId = ? AND recieverId = ?)",
      [user.userId, userId]
    );

    const requestsOutgoing = await db.query(
      "SELECT * FROM requests WHERE (senderId = ? AND recieverId = ?)",
      [userId, user.userId]
    );

    var isFriend = false;
    if (friends[0]) {
      isFriend = true;
    }
    res.send({
      status: "success",
      response: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        isFriend: isFriend,
        isOwn: req.user.userId == user.userId,
        requestOutgoing: requestsOutgoing[0] ? true : false,
        requestIncoming: requestsIncoming[0] ? true : false,
      },
    });
  } else {
    res.status(404).send({ status: "error", response: "user not found" });
  }
};

exports.getOwnProfile = async (req, res) => {
  const userId = req.user.userId;

  const users = await db.query("SELECT * FROM users WHERE userId = ?", [
    userId,
  ]);
  res.send({
    status: "success",
    response: {
      userId: users[0].userId,
      email: users[0].email,
      username: users[0].username,
      displayName: users[0].displayName,
    },
  });
};

exports.editProfile = async (req, res) => {
  const userId = req.user.userId;

  const { displayName, email } = req.body;

  if (displayName && email) {
    const response = await db.query(
      "SELECT * FROM users WHERE email = ? AND userId != ?",
      [email, userId]
    );
    if (response[0]) {
      res
        .status(409)
        .send({ status: "error", response: "email already in use" });
    } else {
      await db.query(
        "UPDATE users SET displayName = ?, email = ? WHERE userId = ?",
        [displayName, email, userId]
      );
      res.send({ status: "success" });
    }
  } else {
    res
      .status(400)
      .send({ status: "error", response: "please specify displayName, email" });
  }
};

exports.getPostsFromUser = async (req, res) => {
  const userId = req.params.userId;
  const page = req.params.page;

  var posts = await db.query(
    "SELECT * FROM posts WHERE userId = ? LIMIT 10 OFFSET ?",
    [userId, page * 10]
  );
  const total = await db.query(
    "SELECT COUNT(postId) as count FROM posts WHERE userId = ?",
    [userId]
  );
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

exports.getLikesFromUser = async (req, res) => {
  const userId = req.params.userId;
  const page = req.params.page;

  var likes = await db.query("SELECT postId FROM ratings WHERE userId = ?", [
    userId,
  ]);

  const total = await db.query(
    "SELECT COUNT(postId) as count FROM ratings WHERE userId = ?",
    [userId]
  );

  const totalPages = Math.ceil(total[0].count / 10);

  console.log(likes);

  if (page) {
    if (likes[0]) {
      likes = await Promise.all(
        likes.map(async (like) => {
          const postResponse = await db.query(
            "SELECT * FROM posts WHERE postId = ?",
            [like.postId]
          );
          const post = postResponse[0];
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
        response: {
          totalPages: totalPages,
          page: Number(page),
          results: likes,
        },
      });
    } else {
      res.send({
        status: "success",
        response: {
          totalPages: 0,
          page: 0,
          results: [],
        },
      });
    }
  } else {
    res.status(400).send({ status: "error", response: "please specify page" });
  }
};

exports.getSavesFromUser = async (req, res) => {
  const userId = req.params.userId;
  const page = req.params.page;

  var saves = await db.query("SELECT postId FROM saves WHERE userId = ?", [
    userId,
  ]);

  const total = await db.query(
    "SELECT COUNT(postId) as count FROM saves WHERE userId = ?",
    [userId]
  );

  const totalPages = Math.ceil(total[0].count / 10);

  console.log(saves);

  if (page) {
    if (saves[0]) {
      saves = await Promise.all(
        saves.map(async (like) => {
          const postResponse = await db.query(
            "SELECT * FROM posts WHERE postId = ?",
            [like.postId]
          );
          const post = postResponse[0];
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
        response: {
          totalPages: totalPages,
          page: Number(page),
          results: saves,
        },
      });
    } else {
      res.send({
        status: "success",
        response: {
          totalPages: 0,
          page: 0,
          results: [],
        },
      });
    }
  } else {
    res.status(400).send({ status: "error", response: "please specify page" });
  }
};

exports.searchProfiles = async (req, res) => {
  const query = req.params.query;

  const friends = await db.query(
    "SELECT * FROM friends WHERE user1Id = ? OR user2Id = ?",
    [req.user.userId, req.user.userId]
  );

  const users = await db.query(
    "SELECT * FROM users WHERE username LIKE ? OR displayName LIKE ?",
    [`%${query}%`, `%${query}%`]
  );
  const friendIds = new Set(
    friends.map((friend) =>
      friend.user1Id === req.user.userId ? friend.user2Id : friend.user1Id
    )
  );

  const friendsList = [];
  const othersList = [];

  users.forEach((user) => {
    if (friendIds.has(user.userId)) {
      friendsList.push({
        userId: user.userId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      });
    } else {
      othersList.push({
        userId: user.userId,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      });
    }
  });

  res.send({
    status: "success",
    response: { friends: friendsList, others: othersList },
  });
};
