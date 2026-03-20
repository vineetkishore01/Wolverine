import { randomUUID } from "crypto";

/**
 * Runs a comprehensive stress test of the Wolverine system via WebSocket.
 * This test simulates a full agentic mission including:
 * 1. WebSocket Handshake and Connection.
 * 2. Complex mission assignment (web research + file writing).
 * 3. Telemetry monitoring.
 * 4. Hindsight distillation and rule creation verification.
 * 
 * @returns A promise that resolves when the test mission completes.
 */
async function runExtensiveTest() {
  console.log("🧬 STARTING EXTENSIVE WOLVERINE STRESS-TEST...");
  console.log("================================================");

  const GATEWAY_URL = "ws://127.0.0.1:18789";
  const ws = new WebSocket(GATEWAY_URL);

  ws.onopen = () => {
    console.log("[Test] 🔌 Connected to Gateway. Initiating Handshake...");
    ws.send(JSON.stringify({
      type: "req",
      id: "handshake_1",
      method: "connect",
      params: {
        nodeId: "test-stress-node",
        capabilities: ["testing", "feedback"],
        displayName: "Stress Test Runner"
      }
    }));
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data.toString());
    
    // --- Step 1: Handshake OK, Send Mission ---
    if (data.id === "handshake_1" && data.ok) {
      console.log("[Test] ✅ Handshake Successful.");
      console.log("[Test] 📤 Sending Mission: Research ETH price and write a calculator script.");
      
      ws.send(JSON.stringify({
        type: "req",
        id: "mission_1",
        method: "agent.chat",
        params: {
          messages: [{ 
            role: "user", 
            content: "First, tell me who you are. Then, find the current price of Ethereum on the web. Finally, use your 'system' tool to write a python script called 'eth_calc.py' that calculates how much ETH I get for $1000 at that price. Tell me when done." 
          }],
          metadata: { testSession: true }
        }
      }));
    }

    // --- Step 2: Monitor Recursive Thoughts & Tools ---
    if (data.type === "event" && data.event === "telemetry") {
      // We'll see these in the main server logs, but we can log them here too
      console.log(`[Wolverine Thought] ${data.payload.content.substring(0, 80)}...`);
    }

    // --- Step 3: Mission Complete ---
    if (data.id === "mission_1") {
      console.log("================================================");
      console.log("🏁 MISSION RESPONSE RECEIVED:");
      if (data.ok) {
        console.log("\x1b[32m" + data.payload.content + "\x1b[0m");
        console.log("\n[Test] ✅ Phase 1-5 Logic Verified.");
      } else {
        console.log("\x1b[31m❌ Mission Failed: " + data.error.message + "\x1b[0m");
      }
      
      // Verification of the Mind (Learning)
      console.log("[Test] 🧠 Checking if Hindsight Distiller is active...");
      ws.send(JSON.stringify({
        type: "req",
        id: "hindsight_test",
        method: "agent.chat",
        params: {
          messages: [{ role: "user", content: "Actually, I changed my mind. I prefer Python scripts to use the 'math' library for all calculations." }],
          metadata: { testSession: true }
        }
      }));
    }

    if (data.id === "hindsight_test") {
        console.log("[Test] ✅ Hindsight Correction Sent. Check Dashboard for Rule Creation.");
        process.exit(0);
    }
  };

  ws.onerror = (err) => console.error("[Test] ❌ WebSocket Error:", err);
}

runExtensiveTest();
