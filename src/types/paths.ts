import path from "path";
import fs from "fs";

// The "Single Source of Truth" for Wolverine's external state
// Located outside the source code folder to keep Wolverine "clean"
function findWorkspaceRoot(): string {
  const cwd = process.cwd();
  
  // Try common patterns
  const candidates = [
    path.resolve(cwd, "../WolverineWorkspace"),
    path.resolve(cwd, "WolverineWorkspace"),
    path.join(cwd, "WolverineWorkspace"),
  ];
  
  // Also check if we're in src/ subdirectory
  if (cwd.includes("/src/") || cwd.includes("\\src\\")) {
    candidates.push(path.resolve(cwd, "../../WolverineWorkspace"));
  }
  
  // Use environment variable if set
  if (process.env.WOLVERINE_WORKSPACE) {
    candidates.unshift(process.env.WOLVERINE_WORKSPACE);
  }
  
  // Find first existing or use first candidate
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  
  // Default to first candidate (create it)
  return candidates[0];
}

const WORKSPACE_ROOT = findWorkspaceRoot();

export const PATHS = {
  root: WORKSPACE_ROOT,
  skills: path.join(WORKSPACE_ROOT, "skills"),
  logs: path.join(WORKSPACE_ROOT, "logs"),
  data: path.join(WORKSPACE_ROOT, "data"),
  tmp: path.join(WORKSPACE_ROOT, "tmp"),
  
  // Settings can be in multiple locations - check env or common paths
  get settings(): string {
    const candidates = [
      process.env.WOLVERINE_SETTINGS || "",
      path.resolve(process.cwd(), "settings.json"),
      path.resolve(process.cwd(), "../settings.json"),
      path.join(WORKSPACE_ROOT, "settings.json"),
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
    return candidates[1]; // Default to cwd/settings.json
  }
};

export function ensureWorkspaceFolders() {
  [PATHS.root, PATHS.skills, PATHS.logs, PATHS.data, PATHS.tmp].forEach(p => {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      console.log(`[System] Created workspace folder: ${p}`);
    }
  });
}
