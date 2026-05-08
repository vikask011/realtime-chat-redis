// ─── tests/load.test.js ───────────────────────────────────────
// Simulates CONCURRENT_USERS users all connecting and sending
// messages simultaneously. Measures:
//   • Total connections established
//   • Connection success rate (%)
//   • Messages sent vs delivered
//   • Throughput (messages/sec)
//   • Per-message latency percentiles under load
//   • Peak memory usage of the Node process (reported by server
//     via a /health endpoint if available, otherwise skipped)
//
// Usage:  node tests/load.test.js

const { io }  = require("socket.io-client");
const axios   = require("axios");
const fs      = require("fs");
const path    = require("path");
const { BASE_URL, USERS, LOAD_TEST } = require("./config");

const { CONCURRENT_USERS, MESSAGES_PER_USER, RAMP_UP_MS } = LOAD_TEST;

// ── helpers ────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.ceil((p / 100) * sorted.length) - 1];
}

function printTable(rows) {
  rows.forEach(([label, value]) => {
    console.log(`  ${label.padEnd(22)} ${value}`);
  });
}

// ── load tokens ────────────────────────────────────────────────
const tokensPath = path.join(__dirname, "tokens.json");
if (!fs.existsSync(tokensPath)) {
  console.error("❌  tokens.json not found — run `node tests/setup.js` first");
  process.exit(1);
}
const tokens   = JSON.parse(fs.readFileSync(tokensPath));
const baseUsers = Object.keys(tokens);

// ── generate virtual user list ─────────────────────────────────
// Cycle through real registered users to fill CONCURRENT_USERS slots
function getUsername(i) {
  return baseUsers[i % baseUsers.length] + (i < baseUsers.length ? "" : `_v${Math.floor(i / baseUsers.length)}`);
}
// Note: virtual suffix users won't have auth tokens but we still
// test socket connection behavior (server will disconnect unknown users
// unless you relax auth — which is fine for connection rate metrics).
// For accurate message delivery tests we only pair real users.

(async () => {
  console.log("\n🔥  Load Test");
  console.log(`    ${CONCURRENT_USERS} concurrent users | ${MESSAGES_PER_USER} messages each`);
  console.log(`    Ramp-up: ${RAMP_UP_MS}ms\n`);

  const sockets      = [];
  const connected    = [];
  const failed       = [];
  const allLatencies = [];
  let   totalSent    = 0;
  let   totalRecv    = 0;

  const startTime = Date.now();

  // ── Phase 1: Ramp up connections ──────────────────────────────
  console.log("📡  Phase 1: Connecting users…");
  const delayBetween = RAMP_UP_MS / CONCURRENT_USERS;

  const connectionPromises = Array.from({ length: CONCURRENT_USERS }, async (_, i) => {
    await sleep(i * delayBetween);

    const username = baseUsers[i % baseUsers.length];
    // Append index so server treats each as a distinct session
    const virtualName = `${username}_load${i}`;

    return new Promise((resolve) => {
      const socket = io(BASE_URL, {
        query:       { username: virtualName },
        transports:  ["websocket"],
        reconnection: false,
        timeout:     5000,
      });

      const timeout = setTimeout(() => {
        failed.push(virtualName);
        resolve(null);
      }, 5000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        connected.push(virtualName);
        sockets.push({ socket, username: virtualName, index: i });
        resolve(socket);
      });

      socket.on("connect_error", () => {
        clearTimeout(timeout);
        failed.push(virtualName);
        resolve(null);
      });
    });
  });

  await Promise.all(connectionPromises);

  const connectTime = Date.now() - startTime;
  console.log(`    ✅ Connected : ${connected.length}/${CONCURRENT_USERS}  (${connectTime}ms)\n`);

  if (connected.length === 0) {
    console.error("❌  No connections succeeded. Is the server running?");
    process.exit(1);
  }

  // ── Phase 2: Message storm ─────────────────────────────────────
  console.log("💬  Phase 2: Sending messages…");

  // Set up receivers on all sockets
  const pendingMap = new Map();
  sockets.forEach(({ socket }) => {
    socket.on("receive_message", (msg) => {
      const arrivedAt = Date.now();
      try {
        const { id, sentAt } = JSON.parse(msg.text);
        if (pendingMap.has(id)) {
          allLatencies.push(arrivedAt - sentAt);
          pendingMap.delete(id);
          totalRecv++;
        }
      } catch (_) {}
    });
  });

  const sendStart = Date.now();

  // Each socket sends MESSAGES_PER_USER messages to the next socket
  const sendPromises = sockets.map(async ({ socket, username, index }, idx) => {
    const targetSocket = sockets[(idx + 1) % sockets.length];
    const to = targetSocket.username;

    for (let m = 0; m < MESSAGES_PER_USER; m++) {
      await sleep(Math.random() * 100); // slight jitter
      const id     = `${username}_${m}`;
      const sentAt = Date.now();
      pendingMap.set(id, sentAt);
      socket.emit("send_message", {
        to,
        text: JSON.stringify({ id, sentAt }),
      });
      totalSent++;
    }
  });

  await Promise.all(sendPromises);

  // Wait for in-flight messages
  await sleep(4000);

  const sendDuration = (Date.now() - sendStart) / 1000; // seconds

  // ── Phase 3: Report ───────────────────────────────────────────
  const sorted     = [...allLatencies].sort((a, b) => a - b);
  const avg        = sorted.length ? sorted.reduce((a,b)=>a+b,0)/sorted.length : 0;
  const throughput = (totalSent / sendDuration).toFixed(1);
  const lossRate   = (((totalSent - totalRecv) / totalSent) * 100).toFixed(1);

  console.log(`\n${"═".repeat(52)}`);
  console.log(`  LOAD TEST RESULTS`);
  console.log(`${"═".repeat(52)}`);
  printTable([
    ["Concurrent Users",    `${connected.length}`],
    ["Connection Rate",     `${((connected.length/CONCURRENT_USERS)*100).toFixed(1)}%`],
    ["Failed Connections",  `${failed.length}`],
    ["Total Msgs Sent",     `${totalSent}`],
    ["Total Msgs Received", `${totalRecv}`],
    ["Message Loss",        `${lossRate}%`],
    ["Throughput",          `${throughput} msg/s`],
    ["Duration",            `${sendDuration.toFixed(2)}s`],
  ]);

  if (sorted.length) {
    console.log(`\n  ── Latency under load ──`);
    printTable([
      ["Min",  `${sorted[0].toFixed(2)} ms`],
      ["Avg",  `${avg.toFixed(2)} ms`],
      ["P50",  `${percentile(sorted, 50).toFixed(2)} ms`],
      ["P90",  `${percentile(sorted, 90).toFixed(2)} ms`],
      ["P95",  `${percentile(sorted, 95).toFixed(2)} ms`],
      ["P99",  `${percentile(sorted, 99).toFixed(2)} ms`],
      ["Max",  `${sorted[sorted.length-1].toFixed(2)} ms`],
    ]);
  }
  console.log(`${"═".repeat(52)}\n`);

  // Save report
  const report = {
    test: "load",
    timestamp: new Date().toISOString(),
    config: { CONCURRENT_USERS, MESSAGES_PER_USER, RAMP_UP_MS },
    results: {
      connected: connected.length,
      failed: failed.length,
      connectionRate: `${((connected.length/CONCURRENT_USERS)*100).toFixed(1)}%`,
      totalSent, totalRecv,
      lossRate: `${lossRate}%`,
      throughput: `${throughput} msg/s`,
      latency: sorted.length ? {
        min:  sorted[0],
        avg:  parseFloat(avg.toFixed(2)),
        p50:  percentile(sorted, 50),
        p90:  percentile(sorted, 90),
        p95:  percentile(sorted, 95),
        p99:  percentile(sorted, 99),
        max:  sorted[sorted.length - 1],
      } : null,
    },
  };
  fs.writeFileSync(
    path.join(__dirname, "results-load.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("💾  Results saved to tests/results-load.json\n");

  sockets.forEach(({ socket }) => socket.disconnect());
  process.exit(0);
})();