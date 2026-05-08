// ─── tests/latency.test.js ────────────────────────────────────
// Measures end-to-end message delivery latency through the full
// Redis pub/sub pipeline:
//   sender emits  →  server buffers  →  Redis publish
//   →  Redis subscriber  →  Socket.IO room  →  receiver gets it
//
// Metrics reported:
//   • Min / Max / Average latency (ms)
//   • P50 / P90 / P95 / P99 latency (ms)
//   • Total messages sent vs received
//   • Message loss rate (%)
//
// Usage:  node tests/latency.test.js

const { io }  = require("socket.io-client");
const fs      = require("fs");
const path    = require("path");
const { BASE_URL } = require("./config");

// ── helpers ────────────────────────────────────────────────────
function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function printResults(label, samples) {
  if (!samples.length) { console.log(`${label}: no samples`); return; }
  const sorted = [...samples].sort((a, b) => a - b);
  const avg    = samples.reduce((a, b) => a + b, 0) / samples.length;
  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊  ${label}`);
  console.log(`${"─".repeat(50)}`);
  console.log(`  Samples : ${samples.length}`);
  console.log(`  Min     : ${sorted[0].toFixed(2)} ms`);
  console.log(`  Avg     : ${avg.toFixed(2)} ms`);
  console.log(`  P50     : ${percentile(sorted, 50).toFixed(2)} ms`);
  console.log(`  P90     : ${percentile(sorted, 90).toFixed(2)} ms`);
  console.log(`  P95     : ${percentile(sorted, 95).toFixed(2)} ms`);
  console.log(`  P99     : ${percentile(sorted, 99).toFixed(2)} ms`);
  console.log(`  Max     : ${sorted[sorted.length - 1].toFixed(2)} ms`);
}

// ── load tokens ────────────────────────────────────────────────
const tokensPath = path.join(__dirname, "tokens.json");
if (!fs.existsSync(tokensPath)) {
  console.error("❌  tokens.json not found — run `node tests/setup.js` first");
  process.exit(1);
}
const tokens = JSON.parse(fs.readFileSync(tokensPath));
const users  = Object.keys(tokens);
if (users.length < 2) {
  console.error("❌  Need at least 2 users in tokens.json");
  process.exit(1);
}

const SENDER   = users[0];
const RECEIVER = users[1];
const TOTAL_MESSAGES = 100;
const INTERVAL_MS    = 50;   // send one message every 50ms → ~20 msg/s

// ── connect sockets ────────────────────────────────────────────
function connect(username) {
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      query: { username },
      transports: ["websocket"],
      reconnection: false,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (e) => {
      console.error(`❌  ${username} connect failed:`, e.message);
      process.exit(1);
    });
  });
}

(async () => {
  console.log("\n⏱️   Latency Test");
  console.log(`    ${SENDER} → ${RECEIVER}  |  ${TOTAL_MESSAGES} messages\n`);

  const senderSocket   = await connect(SENDER);
  const receiverSocket = await connect(RECEIVER);

  const latencies  = [];
  const pendingMap = new Map(); // msgId → sentAt timestamp

  // Receiver listens for messages and records arrival time
  receiverSocket.on("receive_message", (msg) => {
    const arrivedAt = Date.now();
    // The payload includes sentAt embedded in the text field as JSON
    try {
      const { id, sentAt } = JSON.parse(msg.text);
      if (pendingMap.has(id)) {
        latencies.push(arrivedAt - sentAt);
        pendingMap.delete(id);
      }
    } catch (_) {}
  });

  // Send messages one by one with timestamps
  let sent = 0;
  await new Promise((resolve) => {
    const timer = setInterval(() => {
      if (sent >= TOTAL_MESSAGES) {
        clearInterval(timer);
        // Wait up to 3s for remaining in-flight messages
        setTimeout(resolve, 3000);
        return;
      }
      const id     = sent++;
      const sentAt = Date.now();
      pendingMap.set(id, sentAt);
      senderSocket.emit("send_message", {
        to:   RECEIVER,
        text: JSON.stringify({ id, sentAt }),
      });
    }, INTERVAL_MS);
  });

  const received = latencies.length;
  const lost     = TOTAL_MESSAGES - received;

  console.log(`  Sent     : ${TOTAL_MESSAGES}`);
  console.log(`  Received : ${received}`);
  console.log(`  Lost     : ${lost}  (${((lost / TOTAL_MESSAGES) * 100).toFixed(1)}%)`);

  printResults("DM Message Latency (end-to-end)", latencies);

  // Save raw results
  const report = {
    test: "latency",
    timestamp: new Date().toISOString(),
    sender: SENDER,
    receiver: RECEIVER,
    totalSent: TOTAL_MESSAGES,
    received,
    lossRate: `${((lost / TOTAL_MESSAGES) * 100).toFixed(1)}%`,
    latencies,
  };
  fs.writeFileSync(
    path.join(__dirname, "results-latency.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("\n💾  Raw results saved to tests/results-latency.json\n");

  senderSocket.disconnect();
  receiverSocket.disconnect();
  process.exit(0);
})();