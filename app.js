const express = require("express");
const app = express();

app.use(express.json());

// Routers
const authRoutes = require("./routes/authRoutes.js");
const postRoutes = require("./routes/postRoutes.js");
const profileRoutes = require("./routes/profileRoutes.js");
const friendRoutes = require("./routes/friendRoutes.js");
const requestRoutes = require("./routes/requestRoutes.js");

app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/profiles", profileRoutes);
app.use("/friends", friendRoutes);
app.use("/requests", requestRoutes);

module.exports = app;
