const { pub, sub } = require("../config/redis");
const User = require("../models/User");
const Group = require("../models/Group");
const {
  bufferMessage, getBuffered,
  bufferGroupMessage, getBufferedGroup,
  flushUserMessages, flushGroupMessages,
} = require("./messageStore");

const subscribedChannels = new Set();

// Track active users per group: Map<groupId, Set<username>>
const groupActiveUsers = new Map();

function getDMChannel(userA, userB) {
  return "dm__" + [userA, userB].sort().join("__");
}

function getGroupChannel(groupId) {
  return "group__" + groupId;
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

  // ─── DM: Send message ─────────────────────────────────────────
  socket.on("send_message", ({ to, text }) => {
    if (!to || !text?.trim()) return;
    const createdAt = new Date().toISOString();
    const msgData = bufferMessage(username, to, text.trim(), createdAt);
    const channel = getDMChannel(username, to);
    ensureSubscribed(channel);
    pub.publish(channel, JSON.stringify({ type: "dm", ...msgData }));
  });

  // ─── DM: Get live buffered history ────────────────────────────
  socket.on("get_live_history", ({ with: otherUser }) => {
    const buffered = getBuffered(username, otherUser);
    socket.emit("live_history", buffered);
  });

  // ─── Group: Join groups on connect ────────────────────────────
  socket.on("join_groups", async (groupIds) => {
    for (const groupId of groupIds) {
      socket.join("group_room__" + groupId);

      // Track active users in group
      if (!groupActiveUsers.has(groupId)) groupActiveUsers.set(groupId, new Set());
      groupActiveUsers.get(groupId).add(username);

      // Subscribe to this group's Redis pub/sub channel
      const channel = getGroupChannel(groupId);
      ensureSubscribed(channel);
    }
  });

  // ─── Group: Send message ──────────────────────────────────────
  socket.on("send_group_message", ({ groupId, text }) => {
    if (!groupId || !text?.trim()) return;
    const createdAt = new Date().toISOString();
    const msgData = bufferGroupMessage(username, groupId, text.trim(), createdAt);
    const channel = getGroupChannel(groupId);
    ensureSubscribed(channel);
    pub.publish(channel, JSON.stringify({ type: "group", ...msgData }));
  });

  // ─── Group: Get live buffered history ─────────────────────────
  socket.on("get_live_group_history", ({ groupId }) => {
    const buffered = getBufferedGroup(groupId);
    socket.emit("live_group_history", { groupId, messages: buffered });
  });

  // ─── Disconnect ───────────────────────────────────────────────
  socket.on("disconnect", async () => {
    console.log(`${username} disconnected — flushing messages to DB`);
    await flushUserMessages(username);

    // Remove from group active user tracking; flush group if now empty
    for (const [groupId, activeSet] of groupActiveUsers.entries()) {
      activeSet.delete(username);
      if (activeSet.size === 0) {
        await flushGroupMessages(groupId);
        groupActiveUsers.delete(groupId);
      }
    }

    User.findOneAndUpdate({ username }, { online: false }).catch(() => {});
    io.emit("user_status", { username, online: false });
  });
}

function setupSubscriber(io) {
  sub.on("message", (channel, message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "dm") {
        // Deliver to both users' Socket.IO rooms
        io.to(data.from).emit("receive_message", data);
        io.to(data.to).emit("receive_message", data);
      } else if (data.type === "group") {
        // Deliver to everyone in the group room
        io.to("group_room__" + data.toGroup).emit("receive_group_message", data);
      }
    } catch (e) {
      console.error("Redis message error:", e.message);
    }
  });

  console.log("Redis subscriber ready");
}

module.exports = { registerEvents, setupSubscriber };
