const jwt = require("jsonwebtoken");

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
    console.log("A user connected:", socket.user);

    socket.on("message", (data) => {
      console.log("Message received:", data);
      io.emit("message", data);
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
    });
  });
};
