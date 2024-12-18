const db = require("../db");

exports.joinLivefeed = async (data, socket, io) => {
  const livefeedId = data.livefeedId;

  const livefeeds = await db.query(
    "SELECT * FROM livefeeds WHERE livefeedId = ?",
    [livefeedId]
  );

  const activeUsers = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [socket.user.userId]
  );

  if (activeUsers[0]) {
    if (activeUsers[0].livefeedId != null) {
      socket.emit("error", {
        status: "error",
        response: "You are already in this livefeed",
      });
      return;
    }
  }

  if (livefeeds[0]) {
    await db.query("UPDATE activeUsers SET livefeedId = ? WHERE userId = ?", [
      livefeedId,
      socket.user.userId,
    ]);
    socket.join(livefeedId);

    const messages = await db.query(
      "SELECT * FROM livefeedMessages WHERE livefeedId = ? ORDER BY date DESC LIMIT 20",
      [livefeedId]
    );
    const livefeed = await db.query(
      "SELECT * FROM livefeeds WHERE livefeedId = ?",
      [livefeedId]
    );

    socket.emit("livefeed_init_data", {
      messages: messages,
      livefeed: livefeed,
    });

    socket.on("livefeed_message", (data) =>
      handleLivefeedMessage(data, socket, io)
    );
  } else {
    socket.emit("error", { status: "error", response: "livefeed not found" });
  }
};

const handleLivefeedMessage = async (data, socket, io) => {
  const senderId = socket.user.userId;
  const message = data.message;

  const livefeed = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [senderId]
  );

  if (message.length > 255) {
    socket.emit("error", {
      status: "error",
      response: "Message is too long",
    });
    return;
  }
  if (message.length < 1) {
    socket.emit("error", {
      status: "error",
      response: "Message is too short",
    });
    return;
  }

  const lastMessageTime = await db.query(
    "SELECT * FROM livefeedMessages WHERE userId = ? ORDER BY date DESC LIMIT 1",
    [senderId]
  );

  if (lastMessageTime[0]) {
    if (new Date() - lastMessageTime[0].date < 1000 * livefeed[0].cooldown) {
      const time = new Date() - lastMessageTime[0].date;
      socket.emit("cooldown", {
        nextMessage: livefeed[0].cooldown * 1000 - time,
      });
      return;
    }
  }
  db.insert("livefeedMessages", {
    userId: senderId,
    livefeedId: livefeed[0].livefeedId,
    message: message,
  });

  io.to(livefeed[0].livefeedId).emit("livefeed_message", {
    userId: senderId,
    message: message,
    date: new Date(),
  });
};

exports.leaveLivefeed = async (data, socket, io) => {
  const livefeed = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [socket.user.userId]
  );
  if (livefeed[0].livefeedId == null) {
    socket.emit("error", {
      status: "error",
      response: "You are not in a livefeed",
    });
    return;
  }
  await db.query("UPDATE activeUsers SET livefeedId = NULL WHERE userId = ?", [
    socket.user.userId,
  ]);

  socket.leave(livefeed[0].livefeedId);
  socket.off("livefeed_message", (data) =>
    handleLivefeedMessage(data, socket, io)
  );
};
