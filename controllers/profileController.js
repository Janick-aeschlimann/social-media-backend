const db = require("../db");

exports.getProfiles = async (req, res) => {
  const users = await db.getAll("users");
  res.send(
    users.map((user) => ({
      userId: user.userId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    }))
  );
};

exports.getProfile = async (req, res) => {
  const userId = req.params.userId;

  const users = await db.query("SELECT * FROM users WHERE userId = ?", [
    userId,
  ]);

  if (users[0]) {
    res.send({
      userId: users[0].userId,
      email: users[0].email,
      username: users[0].username,
      displayName: users[0].displayName,
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
