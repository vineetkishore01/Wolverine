import warnings
import sys

# Silence SSL and urllib3 warnings before any other imports
try:
    import urllib3
    warnings.filterwarnings("ignore", category=UserWarning, module="urllib3")
    # For newer urllib3 versions
    from urllib3.exceptions import NotOpenSSLWarning
    warnings.filterwarnings("ignore", category=NotOpenSSLWarning)
except ImportError:
    pass

import time
import subprocess
import threading
import requests

class IdleDetector:
    def __init__(self, idle_threshold_minutes=15):
        self.idle_threshold_seconds = idle_threshold_minutes * 60

    def idle_seconds(self) -> int:
        if sys.platform == "darwin":
            return self._macos_idle()
        elif sys.platform.startswith("linux"):
            return self._linux_idle()
        return 0

    def _macos_idle(self) -> int:
        try:
            result = subprocess.run(
                ["ioreg", "-c", "IOHIDSystem"],
                capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.splitlines():
                if "HIDIdleTime" in line:
                    nanoseconds = int(line.split("=")[-1].strip())
                    return nanoseconds // 1_000_000_000
        except Exception:
            pass
        return 0

    def _linux_idle(self) -> int:
        try:
            result = subprocess.run(["xprintidle"], capture_output=True, text=True, timeout=5)
            return int(result.stdout.strip()) // 1000
        except Exception:
            pass
        return 0

class MadMaxScheduler:
    def __init__(self):
        self.detector = IdleDetector(idle_threshold_minutes=5) # 5 mins for testing
        self.is_updating = False

    def trigger_rem_cycle(self):
        print("[MadMax] 🧠 System is IDLE. Triggering REM Cycle...")
        try:
            # 1. Consolidate Memories in Chetna (Rust)
            requests.post("http://127.0.0.1:1987/api/memory/decay")
            requests.post("http://127.0.0.1:1987/api/memory/flush")

            # 2. Trigger Skill Evolution in Gateway (TS)
            requests.post("http://127.0.0.1:18789/api/evolve")

            print("[MadMax] ✅ REM Cycle & Skill Evolution triggered.")
        except Exception as e:
            print(f"[MadMax] ❌ Failed to contact system organs: {e}")


    def run(self):
        print("[MadMax] Scheduler started. Watching for system idle...")
        while True:
            idle_secs = self.detector.idle_seconds()
            
            if idle_secs >= self.detector.idle_threshold_seconds and not self.is_updating:
                self.is_updating = True
                self.trigger_rem_cycle()
                
            elif idle_secs < self.detector.idle_threshold_seconds and self.is_updating:
                print("[MadMax] 🛑 User returned. Pausing background tasks.")
                self.is_updating = False
                
            time.sleep(30) # Check every 30 seconds

if __name__ == "__main__":
    scheduler = MadMaxScheduler()
    scheduler.run()
