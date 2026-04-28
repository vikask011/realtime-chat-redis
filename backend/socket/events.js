const { pub, sub } = require("../config/redis");
const User = require("../models/User");
const { bufferMessage, getBuffered, flushUserMessages } = require("./messageStore");

const subscribedChannels = new Set();

function getChannel(userA, userB) {
  return [userA, userB].sort().join("__");
}

function ensureSubscribed(channel) {
  if (!subscribedChannels.has(channel)) {
    sub.subscribe(channel);
    subscribedChannels.add(channel);
    console.log(`Subscribed to channel: ${channel}`);
  }
}

function registerEvents(io, socket) {
  const { username } = socket.handshake.query;
  if (!username) return socket.disconnect();

  // Mark online
  User.findOneAndUpdate({ username }, { online: true }).catch(() => {});
  io.emit("user_status", { username, online: true });
  socket.join(username);

  console.log(`${username} connected [${socket.id}]`);

  // ─── Send message ─────────────────────────────────────────────
  socket.on("send_message", ({ to, text }) => {
    if (!to || !text?.trim()) return;

    const createdAt = new Date().toISOString();

    // 1. Buffer in memory (NOT saved to DB yet)
    const msgData = bufferMessage(username, to, text.trim(), createdAt);

    // 2. Subscribe to this channel if not already
    const channel = getChannel(username, to);
    ensureSubscribed(channel);

    // 3. Publish via Redis for real-time delivery
    pub.publish(channel, JSON.stringify(msgData));
  });

  // ─── Request buffered history (for when both users are online) ─
  socket.on("get_live_history", ({ with: otherUser }) => {
    const buffered = getBuffered(username, otherUser);
    socket.emit("live_history", buffered);
  });

  // ─── Disconnect → flush buffer to MongoDB ─────────────────────
  socket.on("disconnect", async () => {
    console.log(`${username} disconnected — flushing messages to DB`);
    await flushUserMessages(username);
    User.findOneAndUpdate({ username }, { online: false }).catch(() => {});
    io.emit("user_status", { username, online: false });
  });
}

function setupSubscriber(io) {
  sub.on("message", (channel, message) => {
    try {
      const data = JSON.parse(message);
      // Deliver to both users' Socket.IO rooms in real time
      io.to(data.from).emit("receive_message", data);
      io.to(data.to).emit("receive_message", data);
    } catch (e) {
      console.error("Redis message error:", e.message);
    }
  });

  console.log("Redis subscriber ready");
}

module.exports = { registerEvents, setupSubscriber };
