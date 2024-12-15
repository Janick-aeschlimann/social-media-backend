const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, profileController.getProfiles);
router.get("/own", authMiddleware, profileController.getOwnProfile);
router.get("/:userId", authMiddleware, profileController.getProfile);
router.put("/", authMiddleware, profileController.editProfile);

module.exports = router;
