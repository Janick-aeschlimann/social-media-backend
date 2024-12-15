const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, requestController.getRequests);
router.post("/:userId/send", authMiddleware, requestController.sendRequest);
router.post("/:userId/accept", authMiddleware, requestController.acceptRequest);
router.post("/:userId/cancel", authMiddleware, requestController.cancelRequest);

module.exports = router;
