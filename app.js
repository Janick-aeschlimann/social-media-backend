const express = require("express");
const app = express();

app.use(express.json());

// Routers
const authRoutes = require("./routes/authRoutes.js");
const postRoutes = require("./routes/postRoutes.js");
const profileRoutes = require("./routes/profileRoutes.js");

app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/profiles", profileRoutes);

module.exports = app;
