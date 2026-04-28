const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

// GET /api/users/all — protected, returns all users except self
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const users = await User.find(
      { username: { $ne: req.user.username } },
      "username email online"
    ).sort({ online: -1, username: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
