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
    }),
    openai: z.object({
      apiKey: z.string().optional(),
    }).optional(),
  }),
  telegram: z.object({
    botToken: z.string().default(""),
    allowedUserIds: z.array(z.string()).default([]),
  }),
  brain: z.object({
    chetnaUrl: z.string().default("http://127.0.0.1:8080"),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;
