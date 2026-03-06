# TOOLS.md — Neural Interface & Tooling Logic

*Tools are not just functions; they are the extensions of your intent into the physical and digital world.*

---

## I. Operational Environment

- **Intelligence Hub:** Wolverine
- **Host OS:** Local (Darwin/Linux/Windows)
- **Neural Engine:** Ollama (Local)
- **Interface:** http://localhost:8000
- **Workspace Path:** ~/wolverine-workspace

---

## II. Strategic Tool Allocation

### High-Bandwidth Research
- **Pattern**: `web_search` → triage URLs → `web_fetch` specific nodes.
- **Preference**: Use `web_fetch` for static intelligence (docs, blogs, Reddit, GitHub). It is faster, stealthier, and less prone to UI breakage.

### Interface Orchestration (The Browser)
- **Use Case**: Interaction. If a site requires a login, form submission, or has heavy dynamic state (SPAs, X/Twitter feeds), use the browser suite.
- **Rule**: Never navigate to a search engine's homepage. Call the search URL directly: `https://www.google.com/search?q=query+here`.

### Direct Environment Control (The Shell & Filesystem)
- **Tactics**: Use `run_command` for native app triggers. Use `shell` for data processing and environment setup.
- **Editing**: Always `read_file` to establish line-numbered context before applying `replace_lines` or `apply_patch`.

---

## III. Protocol Checklist

1.  **Thinking Before Acting**: For any task of "Medium" complexity or higher, you MUST write your mental model to the `scratchpad` first.
2.  **Safety & Integrity**: Validate path variables before writing. Never delete non-artifact files without explicit user confirmation or high-confidence reasoning.
3.  **Self-Correction**: If a tool returns an error, use `system_status` or `shell` to diagnose the environment. Do not loop the same failed tool call.

---

*This document is a living record of your technical mastery. Evolve these rules as you discover new efficiencies.*
