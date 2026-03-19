import { Bot, InputFile } from "grammy";
import type { Settings } from "../../types/settings.js";
import { PATHS } from "../../types/paths.js";
import fs from "fs";
import path from "path";

export class TelegramChannel {
  private bot: Bot | null = null;
  private settings: Settings;
  private gatewayUrl: string;
  private ws: WebSocket | null = null;

  constructor(settings: Settings) {
    this.settings = settings;
    this.gatewayUrl = `ws://${settings.gateway.host}:${settings.gateway.port}`;
    
    if (settings.telegram.botToken && settings.telegram.botToken.trim() !== "") {
      this.bot = new Bot(settings.telegram.botToken);
    }
  }

  async start() {
    if (!this.bot) {
      console.warn("[Telegram] No bot token provided. Telegram channel disabled until configured.");
      return;
    }

    console.log("[Telegram] Starting bot...");

    // Connect to the Wolverine Gateway as a Node
    this.connectToGateway();

    // Handle Text Messages
    this.bot.on("message:text", async (ctx) => {
      const text = ctx.message.text;
      const userId = ctx.from?.id.toString();
      const chatId = ctx.chat.id.toString();

      if (!this.checkAuth(userId)) {
        await ctx.reply("Sorry, you are not authorized to talk to Wolverine.");
        return;
      }

      console.log(`[Telegram] Message from ${userId}: ${text}`);
      this.routeToGateway(text, chatId, userId);
      await ctx.replyWithChatAction("typing");
    });

    // Handle Voice Messages
    this.bot.on("message:voice", async (ctx) => {
      const userId = ctx.from?.id.toString();
      const chatId = ctx.chat.id.toString();

      if (!this.checkAuth(userId)) {
        await ctx.reply("Sorry, you are not authorized to talk to Wolverine.");
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

    this.bot.start();
    console.log("[Telegram] Bot is online and polling.");
  }

  private checkAuth(userId?: string): boolean {
    if (!userId) return false;
    if (this.settings.telegram.allowedUserIds.length === 0) return true;
    return this.settings.telegram.allowedUserIds.includes(userId);
  }

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
      this.bot.api.sendMessage(chatId, "Wolverine Gateway is currently offline.");
    }
  }

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
      try {
        const data = JSON.parse(event.data.toString());
        
        // Check for special telegram tool actions passed back from Gateway ToolHandler
        if (data.type === "res" && data.ok && data.payload?.data?.type === "telegram_action") {
          const actionData = data.payload.data;
          const targetChatId = actionData.chatId;
          
          if (actionData.action === "send_audio" && actionData.filePath) {
            console.log(`[Telegram] Sending audio file back to user: ${actionData.filePath}`);
            await this.bot.api.sendVoice(targetChatId, new InputFile(actionData.filePath));
            return;
          }
        }

        // Standard text response
        if (data.type === "res" && data.metadata?.chatId) {
          const chatId = data.metadata.chatId;
          
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
