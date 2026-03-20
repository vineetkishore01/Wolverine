import { readFileSync } from "fs";
import { SettingsSchema, type Settings } from "./types/settings.js";
import { GatewayServer } from "./gateway/server.js";
import { TelegramChannel } from "./gateway/channels/telegram.js";
import { backgroundRunner } from "./gateway/background-task-runner.js";
import { ensureWorkspaceFolders } from "./types/paths.js";

/**
 * Loads and validates the system settings from settings.json.
 * 
 * @returns {Settings} The validated settings object.
 * @throws {Error} If settings.json is missing or invalid according to SettingsSchema.
 * @sideEffects Reads from the filesystem (settings.json) and may exit the process on failure.
 */
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

/**
 * Initializes and starts the Wolverine Agent Framework.
 * 
 * This function performs the following steps:
 * 1. Ensures necessary workspace folders exist.
 * 2. Loads system settings.
 * 3. Starts the Gateway server.
 * 4. Initializes the Telegram channel.
 * 5. Starts background runners (MadMax and Governance).
 * 6. Sets up graceful shutdown handlers for SIGINT and SIGTERM.
 * 
 * @returns {Promise<void>} A promise that resolves when the system is bootstrapped.
 * @sideEffects Starts multiple servers and background processes, registers process signal listeners, and logs initialization status to the console.
 */
async function bootstrap() {
  console.log("====================================");
  console.log("     WOLVERINE AGENT FRAMEWORK      ");
  console.log("====================================");

  ensureWorkspaceFolders();
  const settings = loadSettings();

  const gateway = new GatewayServer(settings);
  gateway.start();

  const telegram = new TelegramChannel(settings);
  gateway.setTelegramChannel(telegram);
  await telegram.start();

  backgroundRunner.startMadMax();
  backgroundRunner.startGovernance();

  console.log("[System] Wolverine is fully initialized.");

  /**
   * Gracefully shuts down the system.
   * 
   * @param {string} signal - The signal that triggered the shutdown.
   * @sideEffects Stops all background runners and exits the process.
   */
  const shutdown = (signal: string) => {
    console.log(`\n[System] Received ${signal}. Shutting down gracefully...`);
    backgroundRunner.stopAll();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap();
