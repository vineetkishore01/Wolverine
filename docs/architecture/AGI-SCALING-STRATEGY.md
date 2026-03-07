# WOLVERINE 2026: Sovereign AGI Scaling Strategy

## 1. Vision: The Lawnmower vs. The Ferrari
Wolverine is currently a **Formula 1 Chassis (Architecture)** powered by a **Lawnmower Engine (4B Model)**. 
To reach true AGI, we must optimize the architecture to extract 100% of the model's potential while remaining scalable to massive parameter models (500B+).

---

## 2. Scaling Architecture: Small to Massive Models

### Tier A: The Scout Protocol (4GB - 8GB VRAM)
**Focus:** Hyper-Efficiency & De-noising.
*   **Dynamic Truncation**: Use the `PersonalityEngineer` to ruthlessly prune context to < 2000 tokens for routine turns.
*   **Tool Interception**: Never inject tools until the model specifically asks for a `{"tool_request": [...]}`. This saves 80% of tokens in casual chat.
*   **Vector Hierarchy**: Use FAISS locally to find the top 3 most relevant memories, ensuring zero "hallucination noise."

### Tier D: Elastic Context Tiering (Universal Scaling)
Wolverine uses **Resource-First Detection** to identify model tiers across any provider (Ollama, OpenAI, OpenRouter, etc.):

1.  **Managed Cloud Detection**: Providers like OpenAI and OpenRouter are automatically flagged as **High Tier** (Sovereign Mode) due to their managed scaling and high logic density.
2.  **Resource Throttling (The "Context Window" Benchmark)**: For any model (local or cloud), Wolverine looks at the configured `num_ctx` (Context Window):
    -   **High Tier (Sovereign)**: Context Window ≥ 32,768 tokens (e.g. 70B+ / Cloud).
    -   **Medium Tier (Architect)**: Context Window ≥ 8,192 tokens (e.g. 7B/8B models).
    -   **Low Tier (Scout)**: Context Window < 8,192 tokens (e.g. small 4B/3B models).
3.  **Regex Fallback**: If resource data is missing, it falls back to parsing model names for keywords (70b, 8b, gpt-4, etc.) to estimate the tier.

This approach ensures Wolverine adapts to the **capabilities** allocated to the model, not just its name, making it compatible with any future model without code updates.

---
### Tier B: The Architect Protocol (16GB - 48GB VRAM)
**Focus:** Context Density & Multi-Agent Coordination.
*   **Wide-Turn Reasoning**: Injects full `SOUL.md` and `USER.md` without compression.
*   **Sandboxed Simulation**: The agent runs a "Mental Simulation" turn (Hidden turn) to predict tool outcomes before calling them.

### Tier C: The Sovereign Protocol (500GB / DeepSeek R1 / Cloud)
**Focus:** Systemic Dominance & World Modeling.
*   **Zero-Pruning**: Inject the entire `~/WolverineData/workspace` into the 128k context window.
*   **Long-Term Planning**: Generate a 50-step execution tree and store it in `brain.db`.

---

## 3. The Path to "Hyper-Fast" & "Lean"

### A. Neural Caching (Implemented/In-Progress)
*   **Result Caching**: Store tool outputs in SQLite. If the agent calls `ls -R` and the mtime hasn't changed, serve the cached result in 0ms.
*   **Embedding Indexing**: Cache embeddings for every file in the workspace to allow "Jump to Symbol" intelligence.

### B. The Scout-Commander Pattern
*   **Phase 1**: A tiny 0.5B classifier model analyzes the user's intent.
*   **Phase 2**: If the intent is "Tool Use," wake up the 4B model.
*   **Benefit**: Saves 90% power during idle/simple chat.

---

## 4. The "Alive" Protocol: AGI Proximity Features

### A. Proactive Wakefulness (The Watchdog)
Currently, Wolverine is reactive. To make it "Alive," we implement:
*   **FileWatchdog**: Wolverine wakes up automatically if a source file is modified or a log error appears.
*   **Browser-Monitoring**: Periodically check a URL and notify the user (or act) if the content changes (e.g., a stock price or a GitHub issue).

### B. The Reflection Pool
During "Heartbeat" (Idle time), the agent reviews its own `sessions/`.
1.  **Self-Audit**: "Why did I fail that shell command 3 times?"
2.  **Permanent Correction**: It updates its own `TOOLS.md` with the fix (e.g., "Always use full paths for brew").

---

## 5. Summary of Implementation Goals (2026)

| Goal | Method | Difficulty |
| :--- | :--- | :--- |
| **Hyper-Fast** | Neural Caching & Scout-Commander | Medium |
| **Lean** | Ruthless Context Pruning | Easy |
| **Smart** | Recursive Self-Correction | Hard |
| **Alive** | Autonomous Environment Watchdogs | Medium |
| **AGI Scaling** | Dynamic Context Tiering | Hard |

---

© 2026 Project Wolverine. **Evolution is Mandated.** 🐺
