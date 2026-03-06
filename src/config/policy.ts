/**
 * policy.ts — Wolverine execution policy constants
 *
 * Single source of truth for limits, thresholds, and caps used across
 * the gateway, session, and chat pipeline. Tuning these in one place
 * makes behavior consistent and easier to adjust.
 */

/** Max tool-calling rounds per chat turn before extending for FILE_OP or stopping */
export const MAX_TOOL_ROUNDS = 20;

/** Max orchestration continuation nudges (browser/desktop/execution retries) per turn */
export const MAX_CONTINUATION_NUDGES = 2;

/** Max chars for tool stdout before truncation (safety + memory) */
export const MAX_TOOL_STDOUT_CHARS = 48_000;

/** Approx chars of history before session compaction triggers */
export const HISTORY_PRUNE_THRESHOLD_CHARS = 3_000;

/** Session cache cleanup: evict entries older than this (ms) */
export const SESSION_CLEANUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Default context size when provider config is missing */
export const DEFAULT_NUM_CTX = 8_192;

/** Default max tokens when provider config is missing */
export const DEFAULT_NUM_PREDICT = 4_096;

/** Summary re-prompt: smaller context for "summarize tool results" follow-up */
export const SUMMARY_NUM_CTX = 4_096;
export const SUMMARY_MAX_TOKENS = 512;
