import { useEffect } from "react";
import { getSocket } from "../services/socket";

export function useSocketEvent(event, handler) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [event, handler]);
}
