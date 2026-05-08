const Message = require("../models/Message");

// In-memory store for DM messages: Map<"userA__userB", [ {from, to, text, createdAt} ]>
const dmBuffer = new Map();

// In-memory store for group messages: Map<groupId, [ {from, toGroup, text, createdAt} ]>
const groupBuffer = new Map();

function getDMKey(userA, userB) {
  return [userA, userB].sort().join("__");
}

// ── DM helpers ──────────────────────────────────────────────────────────────

function bufferMessage(from, to, text, createdAt) {
  const key = getDMKey(from, to);
  if (!dmBuffer.has(key)) dmBuffer.set(key, []);
  const msg = { from, to, text, createdAt };
  dmBuffer.get(key).push(msg);
  return msg;
}

function getBuffered(userA, userB) {
  return dmBuffer.get(getDMKey(userA, userB)) || [];
}

// ── Group helpers ────────────────────────────────────────────────────────────

function bufferGroupMessage(from, groupId, text, createdAt) {
  if (!groupBuffer.has(groupId)) groupBuffer.set(groupId, []);
  const msg = { from, toGroup: groupId, text, createdAt };
  groupBuffer.get(groupId).push(msg);
  return msg;
}

function getBufferedGroup(groupId) {
  return groupBuffer.get(groupId) || [];
}

// ── Flush to MongoDB ──────────────────────────────────────────────────────────

async function flushUserMessages(username) {
  const keysToFlush = [];
  for (const key of dmBuffer.keys()) {
    const [a, b] = key.split("__");
    if (a === username || b === username) keysToFlush.push(key);
  }

  for (const key of keysToFlush) {
    const messages = dmBuffer.get(key);
    if (messages?.length > 0) {
      try {
        await Message.insertMany(messages);
        console.log(`Flushed ${messages.length} DMs for key: ${key}`);
      } catch (e) {
        console.error(`Failed to flush DMs for ${key}:`, e.message);
      }
      dmBuffer.delete(key);
    }
  }
}

async function flushGroupMessages(groupId) {
  const messages = groupBuffer.get(groupId);
  if (messages?.length > 0) {
    try {
      await Message.insertMany(messages);
      console.log(`Flushed ${messages.length} group messages for group: ${groupId}`);
    } catch (e) {
      console.error(`Failed to flush group messages for ${groupId}:`, e.message);
    }
    groupBuffer.delete(groupId);
  }
}

module.exports = {
  bufferMessage,
  getBuffered,
  bufferGroupMessage,
  getBufferedGroup,
  flushUserMessages,
  flushGroupMessages,
};
