const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const livefeedController = require("../controllers/livefeedController");

router.get("/", authMiddleware, livefeedController.getLivefeeds);
router.get("/:livefeedId", authMiddleware, livefeedController.getLivefeed);
router.post("/", authMiddleware, livefeedController.createLivefeed);
router.put("/:livefeedId", authMiddleware, livefeedController.editLivefeed);
router.delete(
  "/:livefeedId",
  authMiddleware,
  livefeedController.deleteLivefeed
);

router.post("/:livefeedId/follow", authMiddleware, livefeedController.follow);
router.delete(
  "/:livefeedId/follow",
  authMiddleware,
  livefeedController.unfollow
);

module.exports = router;
