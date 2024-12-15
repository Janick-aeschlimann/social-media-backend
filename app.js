const express = require("express");
const app = express();

app.use(express.json());

// Routers
const authRoutes = require("./routes/authRoutes.js");
const postRoutes = require("./routes/postRoutes.js");

app.use("/auth", authRoutes);
app.use("/posts", postRoutes);

module.exports = app;
