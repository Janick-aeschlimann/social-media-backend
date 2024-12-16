const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

const port = 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

require("./sockets/sockets")(io);

server.listen(port, () => {
  console.log(`Server is listening on Port: ${port}`);
});
