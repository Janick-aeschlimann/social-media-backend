const db = require("../db");

exports.getRequests = async (req, res) => {
  const userId = req.user.userId;

  var outgoing = await db.query(
    "SELECT recieverId as userId FROM requests WHERE senderId = ?",
    [userId]
  );

  var incoming = await db.query(
    "SELECT senderId as userId FROM requests WHERE recieverId = ?",
    [userId]
  );

  outgoing = outgoing.map((request) => {
    return { userId: request.userId, type: "outgoing" };
  });

  incoming = incoming.map((request) => {
    return { userId: request.userId, type: "incoming" };
  });

  res.send({ status: "success", response: outgoing.concat(incoming) });
};

exports.sendRequest = async (req, res) => {
  const userId = req.user.userId;
  const recieverId = req.params.userId;

  const reciever = await db.query("SELECT * FROM users WHERE userId = ?", [
    recieverId,
  ]);

  if (userId != recieverId) {
    if (reciever[0]) {
      const friends = await db.query(
        "SELECT * FROM friends WHERE (user1Id = ? AND user2Id = ?) OR (user1Id = ? AND user2Id = ?)",
        [userId, recieverId, recieverId, userId]
      );
      if (friends[0]) {
        res.status(409).send({ status: "error", response: "already friends" });
      } else {
        const requests = await db.query(
          "SELECT * FROM requests WHERE (senderId = ? AND recieverId = ?) OR (senderId = ? AND recieverId = ?)",
          [userId, recieverId, recieverId, userId]
        );
        if (requests[0]) {
          res
            .status(409)
            .send({ status: "error", response: "already requested" });
        } else {
          db.insert("requests", { senderId: userId, recieverId: recieverId });
          res.send({ status: "success" });
        }
      }
    } else {
      res.status(404).send({ status: "error", response: "user not found" });
    }
  } else {
    res.status(409).send({
      status: "error",
      response: "cannot send friend request to yourself",
    });
  }
};

exports.acceptRequest = async (req, res) => {
  const userId = req.user.userId;
  const senderId = req.params.userId;

  const sender = await db.query("SELECT * FROM users WHERE userId = ?", [
    senderId,
  ]);

  if (userId != senderId) {
    if (sender[0]) {
      const requests = await db.query(
        "SELECT * FROM requests WHERE senderId = ? AND recieverId = ?",
        [senderId, userId]
      );
      if (requests[0]) {
        db.query("DELETE FROM requests WHERE requestId = ?", [
          requests[0].requestId,
        ]);
        db.insert("friends", { user1Id: senderId, user2Id: userId });
        res.send({ status: "success" });
      } else {
        res
          .status(404)
          .send({ status: "error", response: "request not found" });
      }
    } else {
      res.status(404).send({ status: "error", response: "user not found" });
    }
  } else {
    res
      .status(409)
      .send({
        status: "error",
        response: "cannot send accepüt request from yourself",
      });
  }
};

exports.cancelRequest = async (req, res) => {
  const userId = req.user.userId;
  const senderId = req.params.userId;

  const sender = await db.query("SELECT * FROM users WHERE userId = ?", [
    senderId,
  ]);

  if (userId != senderId) {
    if (sender[0]) {
      const requests = await db.query(
        "SELECT * FROM requests WHERE (senderId = ? AND recieverId = ?) OR (senderId = ? AND recieverId = ?)",
        [senderId, userId, userId, senderId]
      );
      if (requests[0]) {
        db.query("DELETE FROM requests WHERE requestId = ?", [
          requests[0].requestId,
        ]);
        res.send({ status: "success" });
      } else {
        res
          .status(404)
          .send({ status: "error", response: "request not found" });
      }
    } else {
      res.status(404).send({ status: "error", response: "user not found" });
    }
  } else {
    res
      .status(409)
      .send({
        status: "error",
        response: "cannot send accepüt request from yourself",
      });
  }
};
