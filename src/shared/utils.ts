/**
 * Shared Utility Functions
 * Common utilities used across the codebase
 */

/**
 * Clamp a numeric value to an integer within [min, max], with fallback for invalid input.
 * @param value - The value to clamp (will be converted to number)
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fallback - Default value if input is invalid
 * @returns Clamped integer value
 */
export function clampInt(value: any, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
