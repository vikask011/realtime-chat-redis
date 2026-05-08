// ─── tests/config.js ──────────────────────────────────────────
// Central config for all test files.
// Change BASE_URL to your deployed URL when testing in production.

module.exports = {
  BASE_URL: "http://localhost:5000",

  // These users are auto-created by the test setup scripts.
  // You can change names/passwords freely.
  USERS: [
    { username: "testuser1", email: "testuser1@test.com", password: "Test@1234" },
    { username: "testuser2", email: "testuser2@test.com", password: "Test@1234" },
    { username: "testuser3", email: "testuser3@test.com", password: "Test@1234" },
  ],

  // How many virtual users for the load test
  LOAD_TEST: {
    CONCURRENT_USERS: 50,        // simultaneous socket connections
    MESSAGES_PER_USER: 20,       // messages each user sends
    RAMP_UP_MS: 2000,            // spread connections over this window
  },
};