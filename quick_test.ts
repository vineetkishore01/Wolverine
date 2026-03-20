/**
 * @file quick_test.ts
 * @description A lightweight WebSocket client for rapid verification of the Wolverine Gateway's
 * agent.chat method. Connects, sends a brief user message, and logs the response.
 */

import { WebSocket } from "ws";

const ws = new WebSocket("ws://127.0.0.1:18789");

ws.on("open", () => {
  ws.send(JSON.stringify({ type: "req", method: "connect", params: { nodeId: "qtest" } }));
  setTimeout(() => {
    console.log("Sending: My name is Vineet and I am a software engineer");
    ws.send(JSON.stringify({
      type: "req", id: "t1", method: "agent.chat",
      params: { messages: [{ role: "user", content: "My name is Vineet and I am a software engineer" }] }
    }));
  }, 500);
});

ws.on("message", (d) => {
  const m = JSON.parse(d.toString());
  if (m.type === "memory") console.log("🧠", m.content);
  if (m.type === "res" && m.id === "t1") {
    console.log("✅", (m.payload?.content || "").substring(0, 100));
    ws.close();
    process.exit(0);
  }
});

// Auto-terminate after 2 minutes if no response
setTimeout(() => { ws.close(); process.exit(0); }, 120000);
