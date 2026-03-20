import { Bot, InputFile } from "grammy";
import type { Settings } from "../../types/settings.js";
import { PATHS } from "../../types/paths.js";
import fs from "fs";
import path from "path";

/**
 * TelegramChannel provides a bridge between the Telegram Bot API and the Wolverine Gateway.
 * it handles text and voice messages, authorization, and routing responses back to users.
 */
export class TelegramChannel {
  private bot: Bot | null = null;
  private settings: Settings;
  private gatewayUrl: string;
  private ws: WebSocket | null = null;
  private typingIntervals: Map<string, any> = new Map();

  /**
   * Initializes the Telegram bot with provided settings.
   */
  constructor(settings: Settings) {
    this.settings = settings;
    this.gatewayUrl = `ws://${settings.gateway.host}:${settings.gateway.port}`;
    
    if (settings.telegram.botToken && settings.telegram.botToken.trim() !== "") {
      this.bot = new Bot(settings.telegram.botToken);
    }
  }

  private startTypingPulse(chatId: string) {
    if (this.typingIntervals.has(chatId)) return;
    if (!this.bot) return;

    // Telegram chat actions last ~5 seconds, so we refresh every 4s
    const interval = setInterval(() => {
      this.bot?.api.sendChatAction(chatId, "typing").catch(() => {});
    }, 4000);
    
    this.bot.api.sendChatAction(chatId, "typing").catch(() => {});
    this.typingIntervals.set(chatId, interval);
  }

  private stopTypingPulse(chatId: string) {
    const interval = this.typingIntervals.get(chatId);
    if (interval) {
      clearInterval(interval);
      this.typingIntervals.delete(chatId);
    }
  }

  /**
   * Starts the Telegram bot polling and connects to the Wolverine Gateway.
   */
  async start() {
    if (!this.bot) {
      console.warn("[Telegram] No bot token provided. Telegram channel disabled until configured.");
      return;
    }

    this.connectToGateway();

    // Handle Text Messages
    this.bot.on("message:text", async (ctx) => {
      const text = ctx.message.text;
      const userId = ctx.from?.id.toString();
      const chatId = ctx.chat.id.toString();

      if (!this.checkAuth(userId, chatId)) {
        await ctx.reply(`Access Denied. Your Chat ID is: ${chatId}. Add this to your settings to authorize.`);
        return;
      }

      console.log(`[Telegram] Message from ${userId}: ${text}`);
      
      // Start typing pulse to give hope
      this.startTypingPulse(chatId);
      
      this.routeToGateway(text, chatId, userId);
    });

    // Handle Voice Messages
    this.bot.on("message:voice", async (ctx) => {
      const userId = ctx.from?.id.toString();
      const chatId = ctx.chat.id.toString();

      if (!this.checkAuth(userId, chatId)) {
        await ctx.reply(`Access Denied. Your Chat ID is: ${chatId}. Add this to your settings to authorize.`);
        return;
      }

      await ctx.replyWithChatAction("record_voice");

      try {
        const file = await ctx.getFile();
        const downloadUrl = `https://api.telegram.org/file/bot${this.settings.telegram.botToken}/${file.file_path}`;
        
        const response = await fetch(downloadUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        
        const localPath = path.join(PATHS.tmp, `${crypto.randomUUID()}.ogg`);
        fs.writeFileSync(localPath, buffer);

        console.log(`[Telegram] Voice message saved to ${localPath}`);
        
        // Pass the path to Wolverine so it can decide how to transcribe it
        const prompt = `[SYSTEM: The user has sent a voice message. It is saved locally at absolute path: ${localPath}. You may need to use your 'system' shell tool to transcribe it (e.g., using python/whisper or an API) to understand what they said.]`;
        
        this.routeToGateway(prompt, chatId, userId);

      } catch (err) {
        console.error("[Telegram] Failed to download voice message:", err);
        await ctx.reply("Failed to process your voice message.");
      }
    });

    this.bot.start().catch(err => {
      console.error("[Telegram] Bot failed to start:", err);
    });
    console.log("[Telegram] Bot is online and polling.");
  }

  /**
   * Stops the bot and closes the gateway connection.
   */
  async stop() {
    if (this.bot) {
      console.log("[Telegram] Stopping bot...");
      await this.bot.stop();
      this.bot = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Verifies if a user or chat is authorized to interact with the bot.
   * Checks against allowedChatIds and allowedUserIds whitelists.
   * @param userId - The unique Telegram user ID.
   * @param chatId - The unique Telegram chat ID.
   * @returns True if authorized, false otherwise.
   * @private
   */
  private checkAuth(userId?: string, chatId?: string): boolean {
    if (!userId || !chatId) {
      console.warn("[Telegram] Auth check failed: missing userId or chatId");
      return false;
    }
    
    // If user set allowedChatIds, strictly enforce it
    if (this.settings.telegram.allowedChatIds.length > 0) {
      const isAllowed = this.settings.telegram.allowedChatIds.includes(chatId);
      if (!isAllowed) console.warn(`[Telegram] Unauthorized Chat ID: ${chatId}`);
      return isAllowed;
    }

    // Fallback to allowedUserIds if set
    if (this.settings.telegram.allowedUserIds.length > 0) {
      const isAllowed = this.settings.telegram.allowedUserIds.includes(userId);
      if (!isAllowed) console.warn(`[Telegram] Unauthorized User ID: ${userId}`);
      return isAllowed;
    }

    // Default: block everyone until explicit whitelist is configured
    console.warn(`[Telegram] Auth blocked: No allowed users configured. Current Chat ID: ${chatId}`);
    return false;
  }

  /**
   * Sends a test message to all authorized chat IDs to confirm connectivity.
   */
  async sendTestMessage() {
    if (!this.bot) return;
    const message = "⚡️ **Wolverine Neural Link Established**\n\nYour Telegram channel is now active and authorized. You can send commands directly to this bot.";
    
    for (const chatId of this.settings.telegram.allowedChatIds) {
      try {
        await this.bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
        console.log(`[Telegram] Test message sent to ${chatId}`);
      } catch (err) {
        console.warn(`[Telegram] Failed to send test message to ${chatId}:`, err);
      }
    }
  }

  /**
   * Forwards a message from Telegram to the Wolverine Gateway WebSocket.
   * @param text - The content of the user message.
   * @param chatId - The chat ID to route the response back to.
   * @param userId - The user who sent the message.
   * @private
   */
  private routeToGateway(text: string, chatId: string, userId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "req",
        id: crypto.randomUUID(),
        method: "agent.chat",
        params: {
          messages: [{ role: "user", content: text }],
          metadata: { chatId, userId } 
        }
      }));
    } else {
      if (this.bot) this.bot.api.sendMessage(chatId, "Wolverine Gateway is currently offline.");
    }
  }

  /**
   * Establishes a WebSocket connection to the Wolverine Gateway.
   * Handles automatic reconnection on failure and processes incoming messages from the Gateway.
   * @private
   */
  private connectToGateway() {
    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.onopen = () => {
      console.log("[Telegram] Connected to Gateway Hub");
      this.ws?.send(JSON.stringify({
        type: "req",
        id: crypto.randomUUID(),
        method: "connect",
        params: {
          nodeId: "telegram-channel",
          capabilities: ["messaging", "voice"],
          displayName: "Telegram Bot"
        }
      }));
    };

    this.ws.onmessage = async (event) => {
      if (!this.bot) return;
      try {
        const data = JSON.parse(event.data.toString());

        // Handle CROSS-PLATFORM Sync (Messages from Web UI)
        if (data.type === "chat" || data.type === "msg") {
          const content = data.content || data.payload?.content;
          const source = data.source || data.payload?.role;
          const msgChatId = data.metadata?.chatId;
          
          if (!content) return;

          // RELAY LOGIC:
          // 1. If it's a bot message (res), it's already handled by the "res" block below.
          // 2. If it's a user message from the Web UI, sync it to Telegram.
          // 3. If it's a user message from Telegram, DON'T echo it back to the same chat.
          
          for (const chatId of this.settings.telegram.allowedChatIds) {
            // Don't echo the user's own message back to them on the same platform
            if (source === "user" && msgChatId === chatId) continue;
            
            // Only relay user messages from other sources (like Web UI)
            if (source === "user" && !msgChatId) {
              try {
                await this.bot.api.sendMessage(chatId, `👤 **Sync (Web UI):** ${content}`, { parse_mode: "Markdown" });
              } catch {}
            }
          }
          return;
        }

        // Handle ASYNC Event Messages (like subagent completions)
        if (data.type === "msg" && data.payload?.content) {
          // ... rest of the logic ...
        }
        
        // ... (telegram_action handling) ...

        // Standard text response
        if (data.type === "res" && data.metadata?.chatId) {
          const chatId = data.metadata.chatId;
          
          // STOP typing pulse as we have a result
          this.stopTypingPulse(chatId);

          const isAuthorized = this.settings.telegram.allowedChatIds.includes(chatId);
          if (!isAuthorized) return;
          
          if (data.ok) {
            const content = data.payload.content;
            if (content && content.trim() !== "") {
              await this.bot.api.sendMessage(chatId, content);
            }
          } else {
            await this.bot.api.sendMessage(chatId, `Error: ${data.error?.message || "Unknown error"}`);
          }
        }
      } catch (err) {
        console.error("[Telegram] Error handling gateway message:", err);
      }
    };

    this.ws.onclose = () => {
      console.warn("[Telegram] Connection lost. Retrying in 5s...");
      setTimeout(() => this.connectToGateway(), 5000);
    };
  }
}
