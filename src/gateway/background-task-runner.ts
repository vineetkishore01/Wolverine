import { spawn } from "child_process";
import path from "path";

export class BackgroundTaskRunner {
  private madmaxProcess: ReturnType<typeof spawn> | null = null;
  private governanceProcess: ReturnType<typeof spawn> | null = null;

  startMadMax() {
    console.log("[System] Starting MadMax Idle Scheduler (Python)...");
    
    const cwd = process.cwd();
    const venvPython = path.resolve(cwd, "src/mind/.venv/bin/python");
    const systemPython = "python3";
    
    const pythonPath = this.findPython(venvPython, systemPython);
    const scriptPath = path.resolve(cwd, "src/mind/scheduler.py");

    try {
      this.madmaxProcess = spawn(pythonPath, [scriptPath], {
        stdio: "pipe",
        cwd: cwd
      });
      this.setupLogging(this.madmaxProcess, "\x1b[35m[MadMax]\x1b[0m");
    } catch (err) {
      console.error("[System] Failed to start MadMax:", err);
    }
  }

  startGovernance() {
    console.log("[System] Starting Governance Control Plane (FastAPI)...");
    
    const cwd = process.cwd();
    const venvPython = path.resolve(cwd, "src/mind/.venv/bin/python");
    const systemPython = "python3";
    
    const pythonPath = this.findPython(venvPython, systemPython);
    const scriptPath = path.resolve(cwd, "src/orchestration/control_plane.py");

    try {
      this.governanceProcess = spawn(pythonPath, [scriptPath], {
        stdio: "pipe",
        cwd: cwd
      });
      this.setupLogging(this.governanceProcess, "\x1b[36m[Governance]\x1b[0m");
    } catch (err) {
      console.error("[System] Failed to start Governance:", err);
    }
  }

  private findPython(...candidates: string[]): string {
    const { existsSync } = require("fs");
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return "python3";
  }

  private setupLogging(proc: ReturnType<typeof spawn>, prefix: string) {
    proc.stdout?.on("data", (data: Buffer) => {
      process.stdout.write(`${prefix} ${data.toString()}`);
    });
    proc.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(`\x1b[31m${prefix} ERROR: ${data.toString()}\x1b[0m`);
    });
    proc.on("error", (err) => {
      console.error(`${prefix} Process error:`, err);
    });
    proc.on("exit", (code) => {
      if (code !== 0) {
        console.log(`${prefix} Process exited with code ${code}`);
      }
    });
  }

  stopAll() {
    if (this.madmaxProcess) {
      this.madmaxProcess.kill();
      this.madmaxProcess = null;
    }
    if (this.governanceProcess) {
      this.governanceProcess.kill();
      this.governanceProcess = null;
    }
  }
}

export const backgroundRunner = new BackgroundTaskRunner();
