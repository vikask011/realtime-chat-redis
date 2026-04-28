const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) return res.status(400).json({ error: "Email already registered" });

    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) return res.status(400).json({ error: "Username already taken" });

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ error: "Invalid email or password" });

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
