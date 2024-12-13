const express = require("express");
const app = express();
const cors = require("cors");

const port = 3000;

app.use(
  cors({
    origin: ["http://127.0.0.1:3000", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());

// Routers
const authRoutes = require("./routes/authRoutes.js");

app.use("/auth", authRoutes);

app.listen(port, () => {
  console.log("Server is listening on Port " + port);
});
