const Redis = require("ioredis");

const redisOptions = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  // no tls here — Redis Cloud free tier uses plain TCP
};

const pub = new Redis(redisOptions);
const sub = new Redis(redisOptions);

pub.on("error", (err) => console.error("Redis pub error:", err.message));
sub.on("error", (err) => console.error("Redis sub error:", err.message));

module.exports = { pub, sub };
