const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();

exports.authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ status: "error", response: "No token provided" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ status: "error", response: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
};
