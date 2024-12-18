const express = require("express");
const app = express();
const cors = require("cors");

app.use(express.json());

app.use(
  cors({
    origin: "*", // Allow all origins
    credentials: true, // Allow credentials (cookies, headers)
  })
);

// Routers
const authRoutes = require("./routes/authRoutes.js");
const postRoutes = require("./routes/postRoutes.js");
const profileRoutes = require("./routes/profileRoutes.js");
const friendRoutes = require("./routes/friendRoutes.js");
const requestRoutes = require("./routes/requestRoutes.js");
const livefeedRoutes = require("./routes/livefeedRoutes.js");
const chatRoutes = require("./routes/chatRoutes.js");

app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/profiles", profileRoutes);
app.use("/friends", friendRoutes);
app.use("/requests", requestRoutes);
app.use("/livefeeds", livefeedRoutes);
app.use("/chats", chatRoutes);

module.exports = app;
