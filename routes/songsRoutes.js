const express = require("express");
const router = express.Router();
const musicController = require("../controllers/musicController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/:query", authMiddleware, musicController.searchSongs);

module.exports = router;
