const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, profileController.getProfiles);
router.get("/own", authMiddleware, profileController.getOwnProfile);
router.get("/:userId", authMiddleware, profileController.getProfile);
router.put("/", authMiddleware, profileController.editProfile);

router.get(
  "/:userId/posts/:page",
  authMiddleware,
  profileController.getPostsFromUser
);
router.get(
  "/:userId/likes/:page",
  authMiddleware,
  profileController.getLikesFromUser
);
router.get(
  "/:userId/saves/:page",
  authMiddleware,
  profileController.getSavesFromUser
);

module.exports = router;
