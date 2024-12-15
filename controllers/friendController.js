const db = require("../db");

exports.getFriends = async (req, res) => {
  const userId = req.user.userId;

  const users = await db.query(
    "SELECT CASE WHEN user1Id = ? THEN user2Id ELSE user1Id END AS userId FROM friends WHERE user1Id = ? OR user2Id = ?;",
    [userId, userId, userId]
  );

  const friends = await Promise.all(
    users.map(async (user) => {
      const userData = await db.query("SELECT * FROM users WHERE userId = ?", [
        user.userId,
      ]);
      return userData[0];
    })
  );

  console.log(friends);

  res.send(
    friends.map((user) => ({
      userId: user.userId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    }))
  );
};

exports.deleteFriend = async (req, res) => {
  const userId = req.user.userId;
  const friendId = req.params.friendId;

  const friends = await db.query(
    "SELECT * FROM friends WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)",
    [userId, friendId, friendId, userId]
  );
  console.log(friends);
  if (friends[0]) {
    await db.query("DELETE FROM friends WHERE friendId = ?", [
      friends[0].friendId,
    ]);
    res.send("success");
  } else {
    res.status(404).send("friend not found");
  }
};
