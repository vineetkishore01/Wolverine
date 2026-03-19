export interface TelemetryEvent {
  type: "thought" | "action" | "memory" | "system";
  source: string;
  content: any;
  timestamp: number;
}

export class TelemetryHub {
  private static instance: TelemetryHub;
  private server: any = null;

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

    if (this.server) {
      // Bun's high-speed Pub/Sub
      this.server.publish("telemetry", JSON.stringify(fullEvent));
    }
    
    // Also log to console for development
    console.log(`[\x1b[32mTelemetry\x1b[0m] ${event.type.toUpperCase()} from ${event.source}`);
  }
}

export const telemetry = TelemetryHub.getInstance();
