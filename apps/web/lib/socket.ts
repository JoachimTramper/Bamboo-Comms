import { io, type Socket } from "socket.io-client";
import { getToken } from "@/lib/api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getToken() ?? "";
    socket = io(process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000", {
      transports: ["websocket"],
      auth: { token: token ? `Bearer ${token}` : "" }, // optional
      // extraHeaders: { Authorization: `Bearer ${token}` }, // emergancy fallback
    });

    socket.on("connect", () => console.log("✅ WebSocket connected"));
    socket.on("disconnect", () => console.log("❌ WebSocket disconnected"));
  }
  return socket;
}
