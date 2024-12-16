const db = require("../db");

exports.getProfiles = async (req, res) => {
  const users = await db.getAll("users");
  const userId = req.user.userId;
  res.send(
    await Promise.all(
      users.map(async (user) => {
        const friends = await db.query(
          "SELECT * FROM friends WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)",
          [userId, user.userId, user.userId, userId]
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
        };
      })
    )
  );
};

exports.getProfile = async (req, res) => {
  const userId = req.params.userId;

  const users = await db.query("SELECT * FROM users WHERE userId = ?", [
    userId,
  ]);

  if (users[0]) {
    const user = users[0];
    const friends = await db.query(
      "SELECT * FROM friends WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)",
      [userId, user.userId, user.userId, userId]
    );
    var isFriend = false;
    if (friends[0]) {
      isFriend = true;
    }
    res.send({
      userId: user.userId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      isFriend: isFriend,
    });
  } else {
    res.status(404).send("user not found");
  }
};

exports.getOwnProfile = async (req, res) => {
  const userId = req.user.userId;

  const users = await db.query("SELECT * FROM users WHERE userId = ?", [
    userId,
  ]);
  res.send({
    userId: users[0].userId,
    email: users[0].email,
    username: users[0].username,
    displayName: users[0].displayName,
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
      res.status(409).send("email already in use");
    } else {
      await db.query(
        "UPDATE users SET displayName = ?, email = ? WHERE userId = ?",
        [displayName, email, userId]
      );
      res.send("success");
    }
  } else {
    res.status(400).send("please specify displayName, email");
  }
};
