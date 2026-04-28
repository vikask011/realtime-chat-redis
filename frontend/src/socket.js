import { io } from "socket.io-client";

let socket = null;

export function getSocket(username) {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL, {
      query: { username },
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
