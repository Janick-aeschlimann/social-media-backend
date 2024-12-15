const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friendController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, friendController.getFriends);
router.delete("/:friendId", authMiddleware, friendController.deleteFriend);

module.exports = router;
