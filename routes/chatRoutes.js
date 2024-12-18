const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/:userId/:page", authMiddleware, chatController.getMessages);

module.exports = router;
