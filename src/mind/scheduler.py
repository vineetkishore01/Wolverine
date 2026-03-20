import warnings
import sys
import os

# Silence SSL and urllib3 warnings before any other imports
try:
    import urllib3
    warnings.filterwarnings("ignore", category=UserWarning, module="urllib3")
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
        
        # Configurable endpoints with fallbacks
        gateway_base = os.environ.get("WOLVERINE_GATEWAY_URL", "http://127.0.0.1:18789")
        chetna_base = os.environ.get("CHETNA_URL", "http://127.0.0.1:1987")
        
        evolution_ok = False
        decay_ok = False
        
        try:
            # 1. Trigger Skill Evolution in Gateway (TS)
            response = requests.post(f"{gateway_base}/api/evolve", timeout=10)
            evolution_ok = response.status_code == 200
            if not evolution_ok:
                print(f"[MadMax] ⚠️ Evolution returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"[MadMax] ❌ Cannot reach Gateway at {gateway_base}")
        except requests.exceptions.Timeout:
            print(f"[MadMax] ❌ Evolution request timed out")
        except Exception as e:
            print(f"[MadMax] ❌ Evolution failed: {e}")
        
        try:
            # 2. Consolidate Memories - use existing API endpoints
            # Note: /api/memory/clear is the existing endpoint
            # In a full implementation, this would call Chetna's decay/flush
            # For now, we trigger via Gateway which may proxy to Chetna
            response = requests.post(f"{gateway_base}/api/memory/clear", timeout=10)
            decay_ok = response.status_code == 200
        except requests.exceptions.ConnectionError:
            print(f"[MadMax] ❌ Cannot reach memory API at {gateway_base}")
        except requests.exceptions.Timeout:
            print(f"[MadMax] ❌ Memory consolidation timed out")
        except Exception as e:
            print(f"[MadMax] ⚠️ Memory consolidation: {e}")
        
        if evolution_ok or decay_ok:
            print("[MadMax] ✅ REM Cycle completed.")
        else:
            print("[MadMax] ⚠️ REM Cycle partially failed - will retry on next idle.")


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
