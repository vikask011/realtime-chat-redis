const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");

// POST /api/groups — create a group
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Group name required" });

    const allMembers = [...new Set([req.user.username, ...(members || [])])];
    const group = await Group.create({ name: name.trim(), members: allMembers, createdBy: req.user.username });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups — list groups for current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.username }).sort({ updatedAt: -1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:groupId/members — add members
router.post("/:groupId/members", authMiddleware, async (req, res) => {
  try {
    const { usernames } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.members.includes(req.user.username))
      return res.status(403).json({ error: "Not a member" });

    const updated = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { members: { $each: usernames } } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:groupId/messages — history
router.get("/:groupId/messages", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.members.includes(req.user.username))
      return res.status(403).json({ error: "Not a member" });

    const messages = await Message.find({ toGroup: req.params.groupId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
