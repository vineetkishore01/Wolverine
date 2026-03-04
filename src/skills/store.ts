import fs from 'fs';
import path from 'path';
import { PATHS, resolveDataPath } from '../config/paths.js';

function safeReadDirs(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e && typeof e.isDirectory === 'function' && e.isDirectory())
      .map((e) => String(e.name || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function sanitizeSkillId(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\.(md|markdown)$/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'skill';
}

function copyLegacySkillsIfNeeded(projectRoot: string, legacyRoot: string): void {
  try {
    if (path.resolve(projectRoot) === path.resolve(legacyRoot)) return;
    const projectEntries = safeReadDirs(projectRoot);
    if (projectEntries.length > 0) return;
    const legacyEntries = safeReadDirs(legacyRoot);
    if (!legacyEntries.length) return;
    fs.mkdirSync(projectRoot, { recursive: true });
    for (const slug of legacyEntries) {
      const src = path.join(legacyRoot, slug);
      const dest = path.join(projectRoot, slug);
      if (fs.existsSync(dest)) continue;
      try {
        fs.cpSync(src, dest, { recursive: true, force: false });
      } catch {
        // Ignore per-skill copy failures to avoid blocking startup.
      }
    }
  } catch {
    // best-effort migration only
  }
}

export function resolveSkillsRoot(): string {
  const skillsDir = PATHS.skills();
  fs.mkdirSync(skillsDir, { recursive: true });
  return skillsDir;
}

export function resolveSkillDir(skillId: string): string {
  return path.join(resolveSkillsRoot(), sanitizeSkillId(skillId));
}

export function resolveSkillLockFile(): string {
  return resolveDataPath('.clawhub', 'lock.json');
}

export function ensureSkillsRoot(): string {
  const root = resolveSkillsRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function listSkillIds(): string[] {
  return safeReadDirs(resolveSkillsRoot()).map(sanitizeSkillId).filter(Boolean).sort();
}

export function normalizeSkillId(input: string): string {
  return sanitizeSkillId(input);
}
