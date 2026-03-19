import { readFileSync } from "fs";
import { SettingsSchema, type Settings } from "./types/settings.js";
import { GatewayServer } from "./gateway/server.js";
import { TelegramChannel } from "./gateway/channels/telegram.js";
import { backgroundRunner } from "./gateway/background-task-runner.js";
import { ensureWorkspaceFolders } from "./types/paths.js";

function loadSettings(): Settings {
  try {
    const file = readFileSync("settings.json", "utf-8");
    const json = JSON.parse(file);
    return SettingsSchema.parse(json);
  } catch (err) {
    console.error("Failed to load settings.json. Ensure it exists and follows the schema.", err);
    process.exit(1);
  }
}

async function bootstrap() {
  console.log("====================================");
  console.log("     WOLVERINE AGENT FRAMEWORK      ");
  console.log("====================================");

  ensureWorkspaceFolders();
  const settings = loadSettings();

  const gateway = new GatewayServer(settings);
  gateway.start();

  const telegram = new TelegramChannel(settings);
  await telegram.start();

  backgroundRunner.startMadMax();
  backgroundRunner.startGovernance();

  console.log("[System] Wolverine is fully initialized.");

  const shutdown = (signal: string) => {
    console.log(`\n[System] Received ${signal}. Shutting down gracefully...`);
    backgroundRunner.stopAll();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap();
