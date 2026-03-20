# Wolverine: The Sentience Shift (Architecture Deep-Dive)

This document outlines the architectural transition from **Heuristic-Driven Automation** to **Reasoning-Driven Intelligence**. 

## 1. Centralized Semantic Reasoning (`IntelligenceUtils`)
Wolverine now uses a centralized "judgment" layer to replace hardcoded thresholds and magic numbers.

*   **Dynamic Importance Scoring:** Instead of static importance (e.g., 0.6), every memory/fact is passed through an LLM "Value Assessment" prompt. It ranks data from 0.0 (transient noise) to 1.0 (architectural pivot points).
*   **Adaptive Environment Sensing:** The `PinchtabBridge` no longer uses a fixed 1280x720 window. SPR (Synapse Predictive Routing) analyzes the target URL and task intent to select optimal browser profiles (Mobile vs. Desktop, Bot-Avoidance UAs, etc.) dynamically.
*   **Semantic Noise Filtering:** Replaced hardcoded error suppression lists (e.g., "Cannot read property of undefined") with LLM classification. The system now "decides" if a crash is a learning opportunity or environmental noise.

## 2. Autonomic Intelligence Pipeline
The core cognitive loop has been upgraded to prioritize semantic understanding over syntactic parsing.

*   **Zero-Regex Fact Extraction:** The legacy regex patterns for user facts have been entirely removed. Wolverine now uses a high-density JSON extraction pass. It captures nuance ("I'm starting to prefer Rust over Go") that patterns miss.
*   **Reflexive Memory Pass:** Before invoking the full predictive pass, SPR performs a "Reflex Check" against Chetna. If semantic similarity to past social interactions is high, it fast-tracks the response, saving GPU cycles.
*   **Instruction-Native Tooling:** The tool parser now uses a "Structural Scan" that finds valid JSON schemas anywhere in a response, even if the model violates prefix rules or "chats" before acting.

## 3. Context & Resource Management
Efficient intelligence requires precise control over the agent's short-term memory (Context Window).

*   **Window-Aware Compaction:** The context limit is no longer a fixed number. It is derived as `contextWindow * 0.8` based on your specific model settings.
*   **Token-Weight Cumulative Selection:** Compaction now selects messages based on cumulative token weight rather than message count. This prevents "context overflow" during long technical discussions or large code injections.
*   **Word-Weighted Estimation:** Upgraded the token estimator to a multi-variable heuristic (weighted characters + word count), providing much higher accuracy for code-dense text.

## 4. Resilient System Governance
The "Self-Healing" capabilities of Wolverine have been moved to adaptive algorithms.

*   **Exponential Backoff Link:** The Web UI uses an exponential backoff for WebSocket reconnections ($base \times 2^n$), reducing client-side load during server downtime.
*   **Task State Monitoring:** Subagent "fake sleeps" have been replaced by a Telemetry State Machine. Subagents emit semantic stages (`RESEARCHING`, `DRAFTING`, `VALIDATING`), which are monitored by the Governance Plane.
*   **Dynamic Restart Intelligence:** The `BackgroundTaskRunner` analyzes the "Time-to-Failure" of background services. Early crashes result in aggressive backoff; sustained runs reset the recovery timer.

## 5. Summary of Architecture Philosophy
Wolverine's new architecture follows the **"Infrastructure for Thought"** principle: 
> The code provides the **sensors** and the **actuators**, but the AI provides the **logic** for both. 

This ensures Wolverine is model-agnostic, resilient to stochastic model variance, and capable of actual autonomous growth.
