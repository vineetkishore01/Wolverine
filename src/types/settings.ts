import { z } from "zod";

export const SettingsSchema = z.object({
  gateway: z.object({
    port: z.number().default(18789),
    host: z.string().default("0.0.0.0"),
  }),
  llm: z.object({
    defaultProvider: z.enum(["ollama", "openai", "anthropic", "openrouter"]).default("ollama"),
    ollama: z.object({
      url: z.string().default("http://127.0.0.1:11434"),
      model: z.string().default("llama3"),
      contextWindow: z.number().default(4096),
      thinkMode: z.boolean().default(true),
      temperature: z.number().default(0.7),
    }),
    openai: z.object({
      apiKey: z.string().optional(),
    }).optional(),
  }),
  telegram: z.object({
    botToken: z.string().default(""),
    allowedUserIds: z.array(z.string()).default([]),
    allowedChatIds: z.array(z.string()).default([]), // SECURITY: Restrict to specific chats
  }),
  brain: z.object({
    memoryProvider: z.enum(["chetna", "local_sqlite"]).default("chetna"),
    chetnaUrl: z.string().default("http://127.0.0.1:1987"),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;
