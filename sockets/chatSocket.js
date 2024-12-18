const db = require("../db");

exports.handleChatMessage = async (socket, io) => {
  console.log("Message received:", data);
  const senderId = socket.user.userId;
  const message = data.message;

  const user = await db.query("SELECT * FROM users WHERE userId = ?", [
    data.userId,
  ]);

  if (user[0]) {
    const socketId = await db.query(
      "SELECT * FROM activeUsers WHERE userId = ?",
      [data.userId]
    );

    await db.insert("chatMessages", {
      senderId: senderId,
      recieverId: data.userId,
      message: message,
    });
    if (socketId[0]) {
      io.to(socketId[0].socketId).emit("chat_message", {
        senderId: senderId,
        recieverId: data.userId,
        message: message,
      });
    } else {
      console.log("User is not online");
    }
  } else {
    socket.emit("error", { status: "error", response: "user not found" });
  }
};
