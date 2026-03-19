import { pinchtab } from "./pinchtab-bridge.js";

export class VisionEngine {
  private isCapturing: boolean = false;
  private lastCaptureTime: number = 0;
  private captureCooldown: number = 60000;
  private activityCount: number = 0;

  constructor(_settings?: unknown) {
    console.log("[Vision] Vision Engine initialized (on-demand capture mode)");
  }

  async captureFrame(): Promise<string | null> {
    const now = Date.now();
    if (now - this.lastCaptureTime < this.captureCooldown) {
      return null;
    }

    try {
      const snapshot = await pinchtab.getSnapshot();
      this.lastCaptureTime = now;
      return snapshot;
    } catch {
      return null;
    }
  }

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

  recordActivity() {
    this.activityCount = Math.min(this.activityCount + 5, 20);
  }

  stop() {
    this.isCapturing = false;
  }
}
