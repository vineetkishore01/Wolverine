import path from "path";
import { homedir } from "os";
import fs from "fs";

// The "Single Source of Truth" for Wolverine's external state
// Located outside the source code folder to keep Wolverine "clean"
const WORKSPACE_ROOT = path.resolve(process.cwd(), "../WolverineWorkspace");

export const PATHS = {
  root: WORKSPACE_ROOT,
  skills: path.join(WORKSPACE_ROOT, "skills"),
  logs: path.join(WORKSPACE_ROOT, "logs"),
  data: path.join(WORKSPACE_ROOT, "data"),
  tmp: path.join(WORKSPACE_ROOT, "tmp"),
  
  // Specific data files
  chetnaDb: path.join(WORKSPACE_ROOT, "data", "chetna.db"),
  settings: path.resolve(process.cwd(), "settings.json"), // Settings stays in source for dev convenience
};

export function ensureWorkspaceFolders() {
  [PATHS.root, PATHS.skills, PATHS.logs, PATHS.data, PATHS.tmp].forEach(p => {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      console.log(`[System] Created workspace folder: ${p}`);
    }
  });
}
