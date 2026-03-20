import fs from "fs";
import path from "path";

export interface TelemetryEvent {
  type: "thought" | "action" | "memory" | "system" | "context" | "llm_in" | "llm_out" | "chat" | "obd";
  source: string;
  content: any;
  timestamp: number;
}

export class TelemetryHub {
  private static instance: TelemetryHub;
  private server: any = null;
  private logPath: string;

  private constructor() {
    const diagnosticDir = path.resolve(process.cwd(), "WolverineWorkspace/logs/diagnostics");
    if (!fs.existsSync(diagnosticDir)) {
      fs.mkdirSync(diagnosticDir, { recursive: true });
    }
    this.logPath = path.join(diagnosticDir, "obd_trace.log");
  }

  static getInstance() {
    if (!TelemetryHub.instance) TelemetryHub.instance = new TelemetryHub();
    return TelemetryHub.instance;
  }

  setServer(server: any) {
    this.server = server;
  }

  publish(event: Omit<TelemetryEvent, "timestamp">) {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now()
    };

    // 1. WebSocket Broadcast (for Web UI and OBD CLI)
    if (this.server) {
      this.server.publish("telemetry", JSON.stringify(fullEvent));
    }
    
    // 2. Persistent OBD Trace (Hidden from public, raw data for us)
    const logEntry = `[${new Date(fullEvent.timestamp).toISOString()}] [${fullEvent.type.toUpperCase()}] [${fullEvent.source}] ${JSON.stringify(fullEvent.content)}\n`;
    fs.appendFileSync(this.logPath, logEntry);

    // 3. User-Facing Console Logging (Cleaned/Truncated)
    if (event.type === "chat" || event.type === "system") {
      const colorMap: any = {
        system: "\x1b[37m",
        chat: "\x1b[32m\x1b[1m"
      };
      const color = colorMap[event.type] || "\x1b[0m";
      console.log(`${color}[${event.type.toUpperCase()}] from ${event.source}:\x1b[0m`, 
        typeof event.content === 'string' ? event.content.substring(0, 500) : JSON.stringify(event.content).substring(0, 500));
    }
  }
}

export const telemetry = TelemetryHub.getInstance();
