import { pinchtab } from "./pinchtab-bridge.js";
import { telemetry } from "./telemetry.js";

/**
 * VisionEngine handles on-demand and periodic visual context capture.
 * It uses PinchtabBridge to take snapshots of the current browsing state
 * and integrates with Telemetry for logging visual events.
 */
export class VisionEngine {
  private isCapturing: boolean = false;
  private lastCaptureTime: number = 0;
  private captureCooldown: number = 60000;
  private activityCount: number = 0;

  /**
   * Initializes the VisionEngine.
   * @param _settings - Optional settings (currently unused).
   */
  constructor(_settings?: unknown) {
    console.log("[Vision] Vision Engine initialized (on-demand capture mode)");
  }

  /**
   * Captures a visual frame (Markdown snapshot) of the current page.
   * Enforces a cooldown to prevent excessive resource usage.
   * @returns The Markdown snapshot string, or null if cooldown is active or capture fails.
   */
  async captureFrame(): Promise<string | null> {
    const now = Date.now();
    if (now - this.lastCaptureTime < this.captureCooldown) {
      return null;
    }

    try {
      const snapshot = await pinchtab.getSnapshot();
      this.lastCaptureTime = now;
      
      telemetry.publish({
        type: "system",
        source: "Vision",
        content: `Frame captured: ${snapshot.substring(0, 100)}...`
      });
      
      return snapshot;
    } catch {
      return null;
    }
  }

  /**
   * Starts a background loop that monitors activity.
   * Note: In current "idle mode", it only captures on explicit request (captureFrame).
   */
  startVisualStream() {
    if (this.isCapturing) return;
    this.isCapturing = true;
    console.log("[Vision] Visual stream started (idle mode - captures only on demand)");

    const loop = () => {
      if (!this.isCapturing) return;
      
      if (this.activityCount > 0) {
        this.activityCount--;
      }
      
      setTimeout(loop, 5000);
    };
    
    loop();
  }

  /**
   * Increments the activity level, used to potentially trigger more frequent captures.
   */
  recordActivity() {
    this.activityCount = Math.min(this.activityCount + 5, 20);
  }

  /**
   * Gets the current activity level metric.
   */
  getActivityLevel(): number {
    return this.activityCount;
  }

  /**
   * Stops the background activity loop.
   */
  stop() {
    this.isCapturing = false;
  }
}
