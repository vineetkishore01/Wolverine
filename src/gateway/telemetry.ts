import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Defines the structure of a single telemetry event.
 */
export interface TelemetryEvent {
  /** The category of the event */
  type: "thought" | "action" | "memory" | "system" | "context" | "llm_in" | "llm_out" | "chat" | "obd" | "error" | "prompt_full" | "response_full" | "tool_call" | "tool_result" | "conversation_start" | "conversation_end" | "latency";
  /** The component that generated the event */
  source: string;
  /** The payload of the event (string or object) */
  content: any;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Optional ID to link events to a specific conversation */
  conversationId?: string;
  /** Optional additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Tracks the complete lifecycle and performance metrics of a single user conversation.
 */
export interface ConversationFlow {
  /** Unique conversation identifier */
  id: string;
  /** The initial message from the user */
  userMessage: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime?: number;
  /** The final state of messages sent to the LLM */
  contextAssembly?: any;
  /** The system prompt used */
  systemPrompt?: string;
  /** Full list of messages including history */
  fullPrompt?: any[];
  /** The raw response from the LLM */
  llmResponse?: string;
  /** Summary of all tool calls made during the conversation */
  toolCalls: Array<{ name: string; params: any; result: any; latency: number }>;
  /** The final response sent back to the user */
  finalResponse?: string;
  /** Latency breakdown in milliseconds */
  latency: {
    contextAssembly: number;
    llmCall: number;
    toolExecution: number;
    total: number;
  };
}

/**
 * TelemetryHub is a singleton that captures, broadcasts, and persists system-wide logs and metrics.
 * It provides a real-time stream via WebSockets and writes detailed trace files to disk.
 */
export class TelemetryHub {
  private static instance: TelemetryHub;
  private server: any = null;
  private logPath: string;
  private flowPath: string;
  private writeQueue: string[] = [];
  private isWriting = false;
  private readonly MAX_QUEUE_SIZE = 500;
  private currentConversation: ConversationFlow | null = null;
  private conversationHistory: ConversationFlow[] = [];

  private constructor() {
    const diagnosticDir = path.resolve(process.cwd(), "WolverineWorkspace/logs/diagnostics");
    if (!fs.existsSync(diagnosticDir)) {
      fs.mkdirSync(diagnosticDir, { recursive: true });
    }
    this.logPath = path.join(diagnosticDir, "obd_trace.log");
    this.flowPath = path.join(diagnosticDir, "conversation_flow.jsonl");
  }

  /**
   * Gets the singleton instance of TelemetryHub.
   */
  static getInstance() {
    if (!TelemetryHub.instance) TelemetryHub.instance = new TelemetryHub();
    return TelemetryHub.instance;
  }

  /**
   * Sets the Bun server instance to enable WebSocket broadcasting.
   * @param server - The Bun Server instance.
   */
  setServer(server: any) {
    this.server = server;
  }

  /**
   * Flushes the internal write queue to the trace log file.
   * Uses batching and non-blocking I/O to minimize performance impact.
   * @private
   */
  private async flushQueue() {
    if (this.isWriting) return; // Prevent concurrent writes
    if (this.writeQueue.length === 0) return;
    
    this.isWriting = true;
    const batch = this.writeQueue.splice(0, 50).join("");
    
    try {
      await fs.promises.appendFile(this.logPath, batch);
    } catch (err) {
      console.error("[Telemetry] Write failed:", err);
    }
    this.isWriting = false;
    
    if (this.writeQueue.length >= 50) {
      setImmediate(() => this.flushQueue());
    }
  }

  /**
   * Publishes a telemetry event to all active observers (Web UI, logs, console).
   * @param event - The event data excluding the timestamp (added automatically).
   */
  publish(event: Omit<TelemetryEvent, "timestamp">) {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now()
    };

    // 1. WebSocket Broadcast (for Web UI and OBD CLI)
    if (this.server) {
      this.server.publish("telemetry", JSON.stringify(fullEvent));
    }
    
    // 2. Async write to file (non-blocking)
    const logEntry = `[${new Date(fullEvent.timestamp).toISOString()}] [${fullEvent.type.toUpperCase()}] [${fullEvent.source}] ${JSON.stringify(fullEvent.content)}\n`;
    this.writeQueue.push(logEntry);
    if (this.writeQueue.length > this.MAX_QUEUE_SIZE) {
      this.writeQueue.shift(); // Drop oldest when exceeding limit
    }
    if (this.writeQueue.length >= 50) {
      this.flushQueue();
    }

    // 3. User-Facing Console Logging (Cleaned/Truncated)
    if (event.type === "chat" || event.type === "system" || event.type === "error") {
      const colorMap: any = {
        system: "\x1b[37m",
        chat: "\x1b[32m\x1b[1m",
        error: "\x1b[31m\x1b[1m"
      };
      const color = colorMap[event.type] || "\x1b[0m";
      console.log(`${color}[${event.type.toUpperCase()}] from ${event.source}:\x1b[0m`, 
        typeof event.content === 'string' ? event.content.substring(0, 500) : JSON.stringify(event.content).substring(0, 500));
    }
  }

  /**
   * Initializes a new conversation flow tracking object.
   * @param userMessage - The starting user input.
   * @returns A unique 8-character conversation ID.
   */
  startConversation(userMessage: string): string {
    const convId = randomUUID().substring(0, 8);
    this.currentConversation = {
      id: convId,
      userMessage,
      startTime: Date.now(),
      toolCalls: [],
      latency: {
        contextAssembly: 0,
        llmCall: 0,
        toolExecution: 0,
        total: 0
      }
    };
    
    this.publish({
      type: "conversation_start",
      source: "Telemetry",
      content: { convId, userMessage: userMessage.substring(0, 100) },
      conversationId: convId
    });
    
    return convId;
  }

  /**
   * Records details about how the context was assembled for an LLM prompt.
   * @param systemPrompt - The system prompt used.
   * @param messages - The enriched list of messages sent.
   * @param duration - Time taken to assemble context in ms.
   */
  recordContextAssembly(systemPrompt: string, messages: any[], duration: number) {
    if (!this.currentConversation) return;
    
    this.currentConversation.systemPrompt = systemPrompt;
    this.currentConversation.contextAssembly = messages;
    this.currentConversation.latency.contextAssembly = duration;
    
    this.publish({
      type: "prompt_full",
      source: "Brain",
      content: {
        convId: this.currentConversation.id,
        systemPrompt,
        messageCount: messages.length,
        messages: messages.map(m => ({ role: m.role, content: m.content?.substring?.(0, 200) || "[binary]" }))
      },
      conversationId: this.currentConversation.id
    });
  }

  /**
   * Records the raw response and performance of an LLM call.
   * @param content - The text content returned by the LLM.
   * @param duration - Time taken for the LLM call in ms.
   * @param isToolCall - Whether the response was identified as a tool call.
   */
  recordLLMResponse(content: string, duration: number, isToolCall: boolean) {
    if (!this.currentConversation) return;
    
    this.currentConversation.llmResponse = content;
    this.currentConversation.latency.llmCall = duration;
    
    this.publish({
      type: "response_full",
      source: "Ollama",
      content: {
        convId: this.currentConversation.id,
        duration,
        isToolCall,
        content: content.substring(0, 1000),
        fullLength: content.length
      },
      conversationId: this.currentConversation.id
    });
  }

  /**
   * Records an individual tool execution within the current conversation.
   * @param toolName - Name of the tool.
   * @param params - Parameters passed to the tool.
   * @param result - The output/result from the tool.
   * @param latency - Execution time in ms.
   */
  recordToolCall(toolName: string, params: any, result: any, latency: number) {
    if (!this.currentConversation) return;
    
    this.currentConversation.toolCalls.push({ name: toolName, params, result, latency });
    this.currentConversation.latency.toolExecution += latency;
    
    this.publish({
      type: "tool_call",
      source: "ToolHandler",
      content: { convId: this.currentConversation.id, toolName, params, result, latency },
      conversationId: this.currentConversation.id
    });
  }

  /**
   * Updates the result of the most recent tool call.
   * @param result - The tool execution result.
   */
  recordToolResult(result: any) {
    if (!this.currentConversation) return;
    
    const lastTool = this.currentConversation.toolCalls[this.currentConversation.toolCalls.length - 1];
    if (lastTool) {
      lastTool.result = result;
    }
    
    this.publish({
      type: "tool_result",
      source: "ToolHandler",
      content: { convId: this.currentConversation.id, result },
      conversationId: this.currentConversation.id
    });
  }

  /**
   * Completes a conversation flow, calculates total latency, and persists the flow log.
   * @param finalResponse - The last message sent to the user.
   */
  endConversation(finalResponse: string) {
    if (!this.currentConversation) return;
    
    this.currentConversation.endTime = Date.now();
    this.currentConversation.finalResponse = finalResponse;
    this.currentConversation.latency.total = this.currentConversation.endTime - this.currentConversation.startTime;
    
    this.publish({
      type: "conversation_end",
      source: "Telemetry",
      content: {
        convId: this.currentConversation.id,
        toolCallCount: this.currentConversation.toolCalls.length,
        latency: this.currentConversation.latency,
        finalResponse: finalResponse.substring(0, 200)
      },
      conversationId: this.currentConversation.id
    });
    
    // Write full conversation to flow log
    const flowEntry = JSON.stringify({
      ...this.currentConversation,
      systemPrompt: this.currentConversation.systemPrompt?.substring?.(0, 500) || "[truncated]"
    }) + "\n";
    
    try {
      fs.promises.appendFile(this.flowPath, flowEntry).catch(() => {});
    } catch {}
    
    this.conversationHistory.push(this.currentConversation);
    if (this.conversationHistory.length > 100) {
      this.conversationHistory.shift();
    }
    
    this.currentConversation = null;
  }

  /**
   * Retrieves the last 100 completed conversation flows.
   */
  getConversationHistory(): ConversationFlow[] {
    return this.conversationHistory;
  }

  /**
   * Gets the currently active conversation flow, if any.
   */
  getCurrentConversation(): ConversationFlow | null {
    return this.currentConversation;
  }

  /**
   * Returns the absolute path to the raw trace log.
   */
  getFullLogPath(): string {
    return this.logPath;
  }

  /**
   * Returns the absolute path to the conversation flow log (JSONL).
   */
  getFlowLogPath(): string {
    return this.flowPath;
  }
}

export const telemetry = TelemetryHub.getInstance();
