// ─── tests/setup.js ───────────────────────────────────────────
// Run this ONCE before any other test.
// It registers the test users defined in config.js and saves
// their JWT tokens to tests/tokens.json for other tests to use.
//
// Usage:  node tests/setup.js

const axios = require("axios");
const fs    = require("fs");
const path  = require("path");
const { BASE_URL, USERS } = require("./config");

async function registerOrLogin(user) {
  // Try register first; if username exists, fall back to login
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: user.username,
      email:    user.email,
      password: user.password,
    });
    console.log(`✅  Registered  ${user.username}`);
    return { username: user.username, token: res.data.token };
  } catch (err) {
    if (err.response?.data?.error?.includes("already")) {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        email:    user.email,
        password: user.password,
      });
      console.log(`🔑  Logged in   ${user.username}`);
      return { username: user.username, token: res.data.token };
    }
    throw err;
  }
}

(async () => {
  console.log("\n🔧  Setting up test users against:", BASE_URL, "\n");

  const results = {};
  for (const user of USERS) {
    try {
      const { username, token } = await registerOrLogin(user);
      results[username] = token;
    } catch (e) {
      console.error(`❌  Failed for ${user.username}:`, e.response?.data || e.message);
      process.exit(1);
    }
  }

  const out = path.join(__dirname, "tokens.json");
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log("\n💾  Tokens saved to tests/tokens.json");
  console.log("✅  Setup complete — run the tests now.\n");
})();