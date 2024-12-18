const db = require("../db");

exports.getMessages = async (req, res) => {
  const userId = req.user.userId;
  const otherUserId = req.params.userId;
  const page = req.params.page;

  if (page) {
    const user = await db.query("SELECT * FROM users WHERE userId = ?", [
      otherUserId,
    ]);

    if (user) {
      const messages = await db.query(
        "SELECT * FROM chatMessages WHERE (senderId = ? AND recieverId = ?) OR (senderId = ? AND recieverId = ?) ORDER BY date DESC LIMIT 10 OFFSET ?",
        [userId, otherUserId, otherUserId, userId, page * 10]
      );
      res.send({ status: "success", response: messages });
    } else {
      res.send({ status: "error", response: "User not found" });
    }
  } else {
    res.send({ status: "error", response: "Page parameter is required" });
  }
};
