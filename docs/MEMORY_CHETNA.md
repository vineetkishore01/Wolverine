# Chetna: The Rust Memory Engine

Chetna provides the long-term semantic memory for Wolverine. It runs on port `1987`.

## MCP Tools Provided by Chetna

### `memory_create`
Stores a new fact or experience.
- **valence**: Emotional tone (-1 to 1)
- **arousal**: Intensity (0 to 1)
- **importance**: Priority (0 to 1)
- **category**: `fact`, `rule`, `habit`, `experience`

### `memory_context`
Builds a semantic context block for the LLM based on a query. It performs vector similarity search and formats the results into a human-readable string.

### `memory_decay`
The Ebbinghaus Cycle. Reduces the importance of old, unused memories while strengthening reinforced ones.

## Memory Tagging Logic
Wolverine's `CognitiveCore` applies intelligent tagging during ingestion:
- **`rule`**: Triggered by identity-related keywords ("I am", "My trait"). High weight (0.9).
- **`habit`**: Triggered by behavioral keywords ("always", "whenever"). Used for habit formation.
- **`experience`**: Captured by the `SelfEvolutionEngine` during tool successes or failures.

## Visual Memory
Wolverine feeds 1fps visual frames into Chetna's `experience` category, allowing the agent to "remember" visual states without re-navigating pages.
