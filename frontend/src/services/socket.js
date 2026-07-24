import { io } from "socket.io-client";

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  const url = import.meta.env.VITE_API_URL ?? "";
  socket = io(url, { auth: { token }, transports: ["websocket"] });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
