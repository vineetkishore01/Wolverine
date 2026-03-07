# Prompt Logbook Feature
## View Every Prompt Sent to the Model

**Feature:** Click the token counter in the dashboard to open a logbook showing every prompt sent to the model.

---

## What It Does

When you click the **Tokens: XXX** display in the status bar, a modal opens showing:

1. **System Prompt** - The full system prompt injected for each message
2. **User Messages** - What you sent
3. **Model Response** - What the model replied
4. **Metadata** - Timestamp, model name, token usage (prompt → completion = total)

---

## How to Use

1. **Start chatting** with Wolverine
2. **Click the token counter** in the status bar (it's now clickable!)
3. **View the logbook** - Shows last 50 prompts for current session
4. **Export** - Click "Export JSON" to download for analysis

---

## What You'll See

### Example Log Entry

```
#5 • 3/7/2026, 1:42:15 PM • qwen3.5:4b • Tokens: 120 → 245 = 365

System Prompt:
You are Wolverine, a local-first AI agent...
[Full hierarchical memory context including SOUL.md, USER.md, etc.]

User Messages:
hi

Model Response:
Hello! How can I help you today?
```

---

## Why This Is Useful

### 1. Debug Prompt Injection Issues
See exactly what context is being sent to the model.

### 2. Tune System Prompts
Compare what you think you're sending vs what the model actually receives.

### 3. Analyze Token Usage
See which prompts consume the most tokens.

### 4. Optimize Context
Identify if hierarchical memory is working correctly.

### 5. Export for Fine-Tuning
Download logs to create fine-tuning datasets.

---

## Technical Details

### Backend API

- `GET /api/prompt-logs?sessionId=xxx&limit=50` - Get logs
- `GET /api/prompt-logs/stats?sessionId=xxx` - Get token stats
- `GET /api/prompt-logs/export?sessionId=xxx` - Export JSON
- `DELETE /api/prompt-logs?sessionId=xxx` - Clear logs

### Frontend

- **Click handler** added to `#token-stats` element
- **Modal** dynamically created on first click
- **Logs** fetched and displayed with syntax highlighting
- **Export** downloads as JSON file

### Storage

- Logs saved to `~/WolverineData/prompt_logs.json`
- Max 100 logs per session (auto-pruned)
- Auto-saves every 10 logs

---

## Files Modified

1. `web-ui/wolverine-core.js` - Added click handler and modal
2. `src/gateway/server-v2.ts` - Already has API endpoints
3. `src/db/prompt-logger.ts` - Already logs prompts

---

## Expected Behavior

### When It Works

1. Token counter shows total tokens
2. Hover shows tooltip: "Prompt: XXX | Completion: XXX | Total: XXX\nClick to view prompt logbook"
3. Click opens modal with prompt history
4. Each entry shows system prompt, user messages, model response
5. Export button downloads JSON

### When It Doesn't Work

**"No prompts logged yet"**
- Prompts only logged when token usage is available
- Check that Ollama is returning token usage in response

**Modal doesn't open**
- Check browser console for errors
- Ensure you have an active chat session

**Empty logbook**
- Start a new chat
- Logs are per-session

---

## Privacy Note

Prompt logs contain:
- Your messages
- Model responses
- System prompts (may include file paths)

**Export carefully** - Don't share logs containing sensitive information.

---

## Future Enhancements

Potential improvements:
- [ ] Search/filter logs
- [ ] Compare prompts side-by-side
- [ ] Token usage charts
- [ ] Prompt template variables
- [ ] A/B testing different prompts

---

**Status:** ✅ Implemented and Ready  
**Location:** Click token counter in dashboard  
**Backend:** Already working  
**Frontend:** Just added
