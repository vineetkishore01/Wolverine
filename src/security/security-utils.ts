/**
 * Security Utilities for Wolverine
 * 
 * Provides secure alternatives to dangerous operations:
 * - Safe command execution (no shell injection)
 * - Path validation (no path traversal)
 * - HTML escaping (no XSS)
 * - Environment sanitization (no env injection)
 */

import { spawn, execFile, SpawnOptions } from 'child_process';
import path from 'path';

// ──────────────────────────────────────────────────────────────────────
// SAFE COMMAND EXECUTION
// ──────────────────────────────────────────────────────────────────────

/**
 * Execute a command safely without shell injection risk
 * 
 * @param command - The command to execute (e.g., 'git', 'ls')
 * @param args - Arguments as array (NOT a string)
 * @param options - Spawn options
 * @returns Promise with stdout, stderr, and exit code
 * 
 * @example
 * // SAFE
 * await safeExec('git', ['status', '--porcelain']);
 * 
 * // DANGEROUS (don't do this)
 * await exec('git status --porcelain');
 */
export async function safeExec(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 30000; // 30s default timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const child = spawn(command, args, {
      ...options,
      shell: false, // NEVER use shell
      signal: controller.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({ stdout, stderr, code: code || 0 });
    });

    child.on('spawn', () => {
      // Command started successfully
    });
  });
}

/**
 * Execute a command with file output (safe version of execFile)
 */
export async function safeExecFile(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return safeExec(command, args, { ...options, shell: false });
}

// ──────────────────────────────────────────────────────────────────────
// PATH VALIDATION
// ──────────────────────────────────────────────────────────────────────

/**
 * Validate that a file path is within the allowed workspace
 * Prevents path traversal attacks (e.g., ../../../etc/passwd)
 * 
 * @param filename - The filename to validate
 * @param workspacePath - The allowed workspace directory
 * @returns Validation result with resolved path or error
 * 
 * @example
 * const validation = validateWorkspacePath('config.json', '/workspace');
 * if (validation.valid) {
 *   readFile(validation.resolvedPath!);
 * } else {
 *   throw new Error(validation.error);
 * }
 */
export function validateWorkspacePath(
  filename: string,
  workspacePath: string
): { valid: boolean; resolvedPath?: string; error?: string } {
  try {
    const resolvedPath = path.resolve(workspacePath, filename);
    const resolvedWorkspace = path.resolve(workspacePath);

    // Ensure the resolved path starts with the workspace path
    const isWithinWorkspace = 
      resolvedPath.startsWith(resolvedWorkspace + path.sep) ||
      resolvedPath === resolvedWorkspace;

    if (!isWithinWorkspace) {
      return {
        valid: false,
        error: 'Access denied: path outside workspace boundary',
      };
    }

    // Check for null bytes (path truncation attack)
    if (filename.includes('\0')) {
      return {
        valid: false,
        error: 'Invalid path: null byte detected',
      };
    }

    // Check for shell metacharacters
    if (/[;&|`$(){}]/.test(filename)) {
      return {
        valid: false,
        error: 'Invalid path: shell metacharacters detected',
      };
    }

    return { valid: true, resolvedPath };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid path: ${err.message}`,
    };
  }
}

/**
 * Validate multiple paths are within workspace
 */
export function validateWorkspacePaths(
  filenames: string[],
  workspacePath: string
): { valid: boolean; resolvedPaths?: string[]; error?: string } {
  const resolvedPaths: string[] = [];

  for (const filename of filenames) {
    const validation = validateWorkspacePath(filename, workspacePath);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }
    if (validation.resolvedPath) {
      resolvedPaths.push(validation.resolvedPath);
    }
  }

  return { valid: true, resolvedPaths };
}

// ──────────────────────────────────────────────────────────────────────
// HTML ESCAPING (XSS PREVENTION)
// ──────────────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS attacks
 * 
 * @param text - The text to escape
 * @returns Escaped text safe for HTML insertion
 * 
 * @example
 * const userInput = '<script>alert(1)</script>';
 * const safe = escapeHtml(userInput);
 * // Result: "&lt;script&gt;alert(1)&lt;/script&gt;"
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return String(text).replace(/[&<>"'`=/]/g, (char) => escapeMap[char]);
}

/**
 * Escape text for use in JavaScript strings
 */
export function escapeJs(text: string): string {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ──────────────────────────────────────────────────────────────────────
// ENVIRONMENT SANITIZATION
// ──────────────────────────────────────────────────────────────────────

/**
 * Dangerous environment variables that should never be passed to child processes
 */
const BLOCKED_ENV_VARS = new Set([
  'PATH',
  'NODE_OPTIONS',
  'LD_PRELOAD',
  'LD_LIBRARY_PATH',
  'DYLD_LIBRARY_PATH',
  'DYLD_INSERT_LIBRARIES',
  'PYTHONPATH',
  'RUBYOPT',
  'PERLLIB',
  'JAVA_TOOL_OPTIONS',
  '_JAVA_OPTIONS',
  'CLASSPATH',
  'GEM_PATH',
  'GEM_HOME',
  'NPM_CONFIG_PREFIX',
  'YARN_GLOBAL_FOLDER',
]);

/**
 * Sanitize environment variables before passing to child processes
 * 
 * @param userEnv - User-provided environment variables
 * @param options - Options for blocking additional vars
 * @returns Safe environment object
 * 
 * @example
 * const safeEnv = sanitizeEnvironment({ FOO: 'bar' });
 * spawn('command', ['args'], { env: { ...process.env, ...safeEnv } });
 */
export function sanitizeEnvironment(
  userEnv: Record<string, string> = {},
  options: { blockAdditional?: string[] } = {}
): Record<string, string> {
  const safeEnv: Record<string, string> = {};

  const allBlocked = new Set([
    ...BLOCKED_ENV_VARS,
    ...(options.blockAdditional || []),
  ]);

  for (const [key, value] of Object.entries(userEnv)) {
    // Skip blocked variables
    if (allBlocked.has(key.toUpperCase())) {
      continue;
    }

    // Skip variables with shell metacharacters
    if (/[;&|`$(){}]/.test(value)) {
      continue;
    }

    safeEnv[key] = value;
  }

  return safeEnv;
}

/**
 * Get a minimal safe environment for child processes
 */
export function getMinimalEnv(): Record<string, string> {
  const minimal: Record<string, string> = {};

  // Only copy essential, safe environment variables
  const safeVars = ['HOME', 'USER', 'LOGNAME', 'SHELL', 'TERM', 'LANG', 'LC_ALL'];

  for (const key of safeVars) {
    if (process.env[key]) {
      minimal[key] = process.env[key]!;
    }
  }

  // Set a safe default PATH
  minimal.PATH = process.platform === 'win32'
    ? 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem'
    : '/usr/local/bin:/usr/bin:/bin';

  return minimal;
}

// ──────────────────────────────────────────────────────────────────────
// URL VALIDATION
// ──────────────────────────────────────────────────────────────────────

/**
 * Validate a URL before opening it in a browser
 * Prevents open redirect and SSRF attacks
 * 
 * @param url - The URL to validate
 * @param options - Validation options
 * @returns Validation result
 * 
 * @example
 * const validation = validateUrl('https://example.com');
 * if (validation.valid) {
 *   openBrowser(validation.url!);
 * }
 */
export function validateUrl(
  url: string,
  options: {
    allowedProtocols?: string[];
    blockedHosts?: string[];
  } = {}
): { valid: boolean; url?: string; error?: string } {
  try {
    const parsed = new URL(url);

    // Check protocol
    const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return {
        valid: false,
        error: `Invalid protocol: ${parsed.protocol}. Allowed: ${allowedProtocols.join(', ')}`,
      };
    }

    // Check for blocked hosts (prevent SSRF)
    const blockedHosts = options.blockedHosts || [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata
      '::1', // IPv6 localhost
    ];

    if (blockedHosts.includes(parsed.hostname)) {
      return {
        valid: false,
        error: `Blocked host: ${parsed.hostname}`,
      };
    }

    // Check for private IP addresses (prevent SSRF)
    if (isPrivateIp(parsed.hostname)) {
      return {
        valid: false,
        error: 'Private IP addresses are not allowed',
      };
    }

    return { valid: true, url: parsed.toString() };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid URL: ${err.message}`,
    };
  }
}

/**
 * Check if an IP address is private/internal
 */
function isPrivateIp(hostname: string): boolean {
  // IPv4 private ranges
  const ipv4Private = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // 127.0.0.0/8 (loopback)
    /^0\./, // 0.0.0.0/8
    /^169\.254\./, // 169.254.0.0/16 (link-local)
  ];

  // IPv6 private ranges
  const ipv6Private = [
    /^::1$/, // ::1/128 (loopback)
    /^fc00:/, // fc00::/7 (unique local)
    /^fe80:/, // fe80::/10 (link-local)
  ];

  return ipv4Private.some((regex) => regex.test(hostname)) ||
         ipv6Private.some((regex) => regex.test(hostname));
}

// ──────────────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────────────

export default {
  safeExec,
  safeExecFile,
  validateWorkspacePath,
  validateWorkspacePaths,
  escapeHtml,
  escapeJs,
  sanitizeEnvironment,
  getMinimalEnv,
  validateUrl,
  isPrivateIp,
};
