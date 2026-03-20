import { existsSync } from "fs";
import { PATHS } from "./src/types/paths.js";

/**
 * Executes a 'dry test' of the Wolverine system by pinging all major components.
 * Checks the connectivity of:
 * 1. Filesystem Workspace
 * 2. Chetna (Rust Memory Layer)
 * 3. Governance (Python Mind)
 * 4. Gateway (TypeScript Nervous System)
 * 
 * @returns A promise that resolves when all checks are complete.
 */
async function runDryTest() {
  console.log("🚀 STARTING WOLVERINE DRY TEST...");
  console.log("------------------------------------");

  // 1. Check Workspace Wires
  console.log("[Test] Checking Workspace...");
  const workspaceOk = existsSync(PATHS.root) && existsSync(PATHS.skills);
  console.log(workspaceOk ? "✅ Workspace Wires: OK" : "❌ Workspace Wires: DISCONNECTED");

  // 2. Check Chetna (Rust Memory Layer) Wire
  console.log("[Test] Pinging Chetna (Rust Memory Layer)...");
  try {
    const res = await fetch("http://127.0.0.1:1987/api/health");
    const data: any = await res.json();
    console.log(data.status === "healthy" ? "✅ Chetna Memory Wire: OK" : "❌ Chetna Memory Wire: ERROR");
  } catch {
    console.log("❌ Chetna Memory Wire: OFFLINE");
  }


  // 3. Check Governance (Python Mind) Wire
  console.log("[Test] Pinging Governance (Python Mind)...");
  try {
    const res = await fetch("http://127.0.0.1:8001/health");
    const data: any = await res.json();
    console.log(data.status === "governance_online" ? "✅ Governance Mind Wire: OK" : "❌ Governance Mind Wire: ERROR");
  } catch (err) {
    console.log("❌ Governance Mind Wire: OFFLINE");
  }

  // 4. Check Gateway (TS Nervous System) Wire
  console.log("[Test] Pinging Gateway (TS Nervous System)...");
  try {
    const res = await fetch("http://127.0.0.1:18789/api/status");
    const data: any = await res.json();
    console.log(data.status === "online" ? "✅ Gateway Nervous System Wire: OK" : "❌ Gateway Nervous System Wire: ERROR");
  } catch (err) {
    console.log("❌ Gateway Nervous System Wire: OFFLINE");
  }

  console.log("------------------------------------");
  console.log("🏁 DRY TEST COMPLETE.");
}

runDryTest();
