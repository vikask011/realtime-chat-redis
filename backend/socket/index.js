const { registerEvents, setupSubscriber } = require("./events");

function initSocket(io) {
  setupSubscriber(io);
  io.on("connection", (socket) => {
    registerEvents(io, socket);
  });
}

module.exports = initSocket;
