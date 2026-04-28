const Redis = require("ioredis");

const pub = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT) || 6379,
});

const sub = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT) || 6379,
});

pub.on("error", (err) => console.error("Redis pub error:", err.message));
sub.on("error", (err) => console.error("Redis sub error:", err.message));

module.exports = { pub, sub };
