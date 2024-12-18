const jwt = require("jsonwebtoken");
const db = require("../db");

const connect = async (socket, io) => {
  const activeUsers = await db.query(
    "SELECT * FROM activeUsers WHERE userId = ?",
    [socket.user.userId]
  );

  if (activeUsers[0]) {
    await db.query("DELETE FROM activeUsers WHERE userId = ?", [
      socket.user.userId,
    ]);
    const oldSocket = io.sockets.sockets.get(activeUsers[0].socketId);

    if (oldSocket) {
      oldSocket.disconnect();
    }
  }
  await db.insert("activeUsers", {
    userId: socket.user.userId,
    socketId: socket.id,
  });
};

const disconnect = async (socket) => {
  await db.query("DELETE FROM activeUsers WHERE userId = ?", [
    socket.user.userId,
  ]);
};

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return next(
          new Error("Authentication error: Invalid or expired token")
        );
      }
      socket.user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    connect(socket, io);

    socket.on("chat_message", async (data) => {
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
            sender: senderId,
            message: message,
          });
        } else {
          console.log("User is not online");
        }
      } else {
        socket.emit("error", { status: "error", response: "user not found" });
      }
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
      disconnect(socket);
    });
  });
};
