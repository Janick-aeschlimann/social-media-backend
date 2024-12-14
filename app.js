const express = require("express");
const app = express();

app.use(express.json());

// Routers
const authRoutes = require("./routes/authRoutes.js");

app.use("/auth", authRoutes);

module.exports = app;
