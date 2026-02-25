# SmallClaw Handoff: Context Pinning, Rolling Context, Canvas, and Skills

## 1) Context Message Pinning + Rolling Context (why this helps smaller LLMs)

### What rolling context does now
- Session history is persisted, but normal chat requests only send the most recent **5 turns** (`getHistory(sessionId, 5)`).
- Session storage keeps the last **20 messages** on disk to avoid unbounded growth.
- This keeps prompts compact and predictable for 4B-class models.

### What pinning adds
- In chat UI, users can pin up to **3 messages** from earlier chat history.
- Pinned messages are re-sent with every request (before recent rolling history).
- The pin payload is injected as:
  - marker: `[PINNED CONTEXT - Important messages from earlier in our conversation:]`
  - each pinned user/assistant message
  - short assistant ack: `I have the pinned context. Continuing...`

### Why this is useful for small models
- Prevents important requirements from falling out of the active window.
- Keeps token usage low by pinning only the highest-value facts.
- Gives user-controlled "sticky memory" without needing a large full-history prompt.

### Notes
- Pins are selected in the UI with the **Context** button.
- Pins are currently client-side session state (if page reloads, re-pin as needed).

---

## 2) How Canvas Works

### Core behavior
- Canvas is a right-panel editor with tabs (Code/Preview modes).
- Users can:
  - create new tabs/files
  - drag-and-drop local files into Canvas
  - edit code/text in CodeMirror
  - preview HTML in an iframe

### Save behavior
- **Save** exports/downloads the current tab to the browser download location.
- Canvas save is not a direct workspace write tool by itself.

### "Add to Context" behavior
- Canvas can send file content to chat as a fenced code block.
- It auto-populates the chat input and sends it, so the LLM gets the file content in current context.

### Why this helps smaller LLMs
- Lets users inject only the relevant file chunk instead of giant workspace context.
- Great for targeted edits/reviews where context budget is tight.

---

## 3) How Skills Work (simple)

### What a skill is
- A skill is a folder containing `SKILL.md`:
  - path pattern: `.localclaw/skills/<skill-id>/SKILL.md`
- `SKILL.md` supports frontmatter + instructions body.
- Enabled skills are injected into the system prompt as compact runtime guidance.

### Enable / disable
- In the Skills tab, clicking a skill card toggles it on/off.
- This calls: `POST /api/skills/:id/toggle`.
- State is persisted in `.localclaw/skills_state.json`.

### Create a skill (UI)
- Skills tab -> **+ Create**.
- Fill in:
  - Name
  - Emoji (optional)
  - Description
  - Instructions
- Save creates the skill folder + `SKILL.md`.
- New skills are auto-enabled on creation.

### Upload a skill (manual)
- There is currently no dedicated "Upload ZIP" button in this v2 Skills panel.
- "Upload" = copy a skill folder into `.localclaw/skills`:
  1. Create folder: `.localclaw/skills/my-skill/`
  2. Add file: `.localclaw/skills/my-skill/SKILL.md`
  3. Open Skills tab (or refresh) so the gateway rescans skills
  4. Click the skill card to enable/disable

### Minimal SKILL.md template
```md
---
name: My Skill
description: Short description of what this skill adds
emoji: "[skill]"
version: 1.0.0
---

Instructions for the model go here.
Keep them direct, specific, and short.
```

---

## 4) One-line summary for your post

SmallClaw keeps small models sharp by combining a tight rolling window, user-pinned context, a lightweight Canvas for precise context injection, and click-to-toggle SKILL.md runtime behaviors.
