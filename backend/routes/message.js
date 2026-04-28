const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");

// GET /api/messages/:to — get conversation history between logged-in user and :to
router.get("/:to", authMiddleware, async (req, res) => {
  try {
    const from = req.user.username;
    const { to } = req.params;

    const messages = await Message.find({
      $or: [
        { from, to },
        { from: to, to: from },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
