const Message = require("../models/Message");

// In-memory store: Map<"userA__userB", [ {from, to, text, createdAt} ]>
const messageBuffer = new Map();

function getKey(userA, userB) {
  return [userA, userB].sort().join("__");
}

// Add message to in-memory buffer
function bufferMessage(from, to, text, createdAt) {
  const key = getKey(from, to);
  if (!messageBuffer.has(key)) {
    messageBuffer.set(key, []);
  }
  const msg = { from, to, text, createdAt };
  messageBuffer.get(key).push(msg);
  return msg;
}

// Get buffered messages for a conversation (used to send history if both online)
function getBuffered(userA, userB) {
  const key = getKey(userA, userB);
  return messageBuffer.get(key) || [];
}

// Flush all messages involving a user to MongoDB when they disconnect
async function flushUserMessages(username) {
  const keysToFlush = [];

  for (const key of messageBuffer.keys()) {
    // key format: "userA__userB"
    const [a, b] = key.split("__");
    if (a === username || b === username) {
      keysToFlush.push(key);
    }
  }

  for (const key of keysToFlush) {
    const messages = messageBuffer.get(key);
    if (messages && messages.length > 0) {
      try {
        await Message.insertMany(messages);
        console.log(`Flushed ${messages.length} messages for key: ${key}`);
      } catch (e) {
        console.error(`Failed to flush messages for ${key}:`, e.message);
      }
      messageBuffer.delete(key);
    }
  }
}

module.exports = { bufferMessage, getBuffered, flushUserMessages };
