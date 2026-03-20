import { spawn } from "child_process";
import path from "path";

/**
 * BackgroundTaskRunner manages external processes required by the Wolverine system,
 * such as the MadMax idle scheduler and the Governance control plane.
 * It handles process spawning, logging, and automatic restarts on failure.
 */
export class BackgroundTaskRunner {
  private madmaxProcess: ReturnType<typeof spawn> | null = null;
  private governanceProcess: ReturnType<typeof spawn> | null = null;
  private madmaxRestartDelay = 0;
  private governanceRestartDelay = 0;
  private readonly MAX_RESTART_DELAY = 60000;

  /**
   * Starts the MadMax Idle Scheduler process (Python).
   * If the process is already running, this call is ignored.
   * It finds the appropriate Python interpreter and sets up logging/restart logic.
   */
  startMadMax() {
    if (this.madmaxProcess) return; // Already running
    
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
      // FIX: Pass both onExit (for crashes) AND onSuccess (for reset delay)
      this.setupLogging(
        this.madmaxProcess, 
        "\x1b[35m[MadMax]\x1b[0m", 
        (code) => this.scheduleMadMaxRestart(code),  // onExit - called on crash
        () => this.onProcessSuccess('madmax')  // onSuccess - called on healthy startup
      );
    } catch (err) {
      console.error("[System] Failed to start MadMax:", err);
    }
  }

  /**
   * Schedules a restart for the MadMax process with dynamic backoff.
   * @private
   */
  private scheduleMadMaxRestart(exitCode: number | null) {
    if (this.madmaxRestartDelay >= this.MAX_RESTART_DELAY) {
      console.error("[System] MadMax failed to restart after max retries");
      return;
    }
    
    // Dynamic delay: if it crashed immediately (code 1), wait longer. 
    let baseDelay = this.madmaxRestartDelay || 1000;
    if (exitCode === 1) baseDelay *= 1.5;

    const delay = Math.min(baseDelay, this.MAX_RESTART_DELAY);
    console.log(`[System] MadMax restart (code ${exitCode}) scheduled in ${delay}ms...`);
    setTimeout(() => {
      this.madmaxProcess = null;
      this.madmaxRestartDelay = delay * 2;
      this.startMadMax();
    }, delay);
  }

  /**
   * Starts the Governance Control Plane process (FastAPI).
   * If the process is already running, this call is ignored.
   * It finds the appropriate Python interpreter and sets up logging/restart logic.
   */
  startGovernance() {
    if (this.governanceProcess) return; // Already running
    
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
      // FIX: Pass both onExit (for crashes) AND onSuccess (for reset delay)
      this.setupLogging(
        this.governanceProcess, 
        "\x1b[36m[Governance]\x1b[0m", 
        (code) => this.scheduleGovernanceRestart(code),  // onExit - called on crash
        () => this.onProcessSuccess('governance')  // onSuccess - called on healthy startup
      );
    } catch (err) {
      console.error("[System] Failed to start Governance:", err);
    }
  }

  /**
   * Schedules a restart for the Governance process with dynamic backoff.
   * @private
   */
  private scheduleGovernanceRestart(exitCode: number | null) {
    if (this.governanceRestartDelay >= this.MAX_RESTART_DELAY) {
      console.error("[System] Governance failed to restart after max retries");
      return;
    }

    let baseDelay = this.governanceRestartDelay || 1000;
    if (exitCode === 1) baseDelay *= 1.5;

    const delay = Math.min(baseDelay, this.MAX_RESTART_DELAY);
    console.log(`[System] Governance restart (code ${exitCode}) scheduled in ${delay}ms...`);
    setTimeout(() => {
      this.governanceProcess = null;
      this.governanceRestartDelay = delay * 2;
      this.startGovernance();
    }, delay);
  }

  /**
   * Resets the restart delay for a process once it has successfully started.
   * @param processType - The type of process that succeeded ('madmax' or 'governance').
   * @private
   */
  private onProcessSuccess(processType: 'madmax' | 'governance') {
    if (processType === 'madmax') {
      this.madmaxRestartDelay = 0;
    } else {
      this.governanceRestartDelay = 0;
    }
  }

  /**
   * Finds the first existing Python interpreter from a list of candidates.
   * @param candidates - List of potential python paths.
   * @returns The path to the first existing Python interpreter, or "python3" as a fallback.
   * @private
   */
  private findPython(...candidates: string[]): string {
    const { existsSync } = require("fs");
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return "python3";
  }

  /**
   * Sets up stdout/stderr logging and lifecycle events for a spawned process.
   * Detects successful startup by scanning stdout for specific markers.
   * @param proc - The spawned child process.
   * @param prefix - Log prefix for identification (e.g., "[MadMax]").
   * @param onExit - Optional callback triggered when the process exits with a non-zero code.
   * @param onSuccess - Optional callback triggered once successful startup is detected.
   * @private
   */
  private setupLogging(proc: ReturnType<typeof spawn>, prefix: string, onExit?: (code: number | null) => void, onSuccess?: () => void) {
    proc.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      process.stdout.write(`${prefix} ${msg}`);
      
      // INTELLIGENT: Detect successful startup semantically
      if (onSuccess && (
        msg.includes("Started server process") || 
        msg.includes("Uvicorn running") || 
        msg.toLowerCase().includes("ready") ||
        msg.toLowerCase().includes("initialized")
      )) {
        onSuccess();
        onSuccess = undefined; // Only trigger once
      }
    });
    proc.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString();
      const lowerMsg = msg.toLowerCase();
      
      // Intelligent filtering: only log errors to stderr if they actually look like errors
      const isInformational = lowerMsg.includes("info:") || 
                            lowerMsg.includes("warning:") || 
                            lowerMsg.includes("started") ||
                            lowerMsg.includes("uvicorn");

      if (isInformational) {
        process.stdout.write(`${prefix} ${msg}`);
      } else {
        process.stderr.write(`\x1b[31m${prefix} ERROR: ${msg}\x1b[0m`);
      }
    });
    proc.on("error", (err) => {
      console.error(`${prefix} Process error:`, err);
    });
    proc.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.log(`${prefix} Process exited with code ${code}`);
        onExit?.(code);
      }
    });
  }

  /**
   * Kills all managed background processes.
   */
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
