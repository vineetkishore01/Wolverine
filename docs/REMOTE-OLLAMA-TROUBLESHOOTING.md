# Remote Ollama Troubleshooting Guide
## Fix "fetch failed" and "EOF" Errors

**Issue:** GPU fires up but you get `Chat error: fetch failed` or `Chat error: EOF`

---

## Root Cause

The error means Wolverine **can reach** your remote Ollama instance (GPU activates), but the **connection times out or is interrupted** before the response completes.

---

## Solution 1: Increase Timeout (Most Likely Fix)

### Add to `.env`:

```bash
# Remote Ollama needs longer timeout (5 minutes)
OLLAMA_TIMEOUT=300000
```

### Restart Wolverine:

```bash
# Stop current instance (Ctrl+C)
npm run gateway
```

---

## Solution 2: Check Remote Ollama Configuration

### On Remote Server:

```bash
# 1. Check Ollama is listening on correct interface
ollama serve 2>&1 | grep -i listen

# Should show: Listening on 0.0.0.0:11434 (not 127.0.0.1)

# 2. If it's only on localhost, fix it:
OLLAMA_HOST=0.0.0.0 ollama serve
```

### In Systemd (if using systemd):

```bash
# Edit Ollama service
sudo nano /etc/systemd/system/ollama.service

# Add environment variable:
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"

# Reload and restart:
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

---

## Solution 3: Check Firewall Rules

### On Remote Server:

```bash
# Check if port 11434 is open
sudo ufw status | grep 11434

# If not listed, allow it:
sudo ufw allow 11434/tcp
sudo ufw reload

# Or for firewalld:
sudo firewall-cmd --permanent --add-port=11434/tcp
sudo firewall-cmd --reload
```

### Test Connectivity:

```bash
# From your local machine:
nc -zv <remote-ip> 11434

# Should show: Connection succeeded
```

---

## Solution 4: Check Ollama Model

### Verify Model Exists on Remote:

```bash
# SSH to remote server
ssh user@remote-ip

# Check model exists:
ollama list | grep qwen

# If not installed:
ollama pull qwen3.5:4b
```

### Check Model Name Matches:

Your config shows `qwen3:4b` but you might have `qwen3.5:4b`:

```bash
# Check what you have:
ollama list

# Update .env if needed:
WOLVERINE_MODEL=qwen3.5:4b
```

---

## Solution 5: Check Remote Server Resources

### Memory:

```bash
# SSH to remote
ssh user@remote-ip

# Check memory:
free -h

# If <4GB free, model may be OOM killing:
dmesg | grep -i "killed process"
```

### GPU Memory:

```bash
# Check GPU memory:
nvidia-smi

# If VRAM is full, model may fail to load
```

---

## Solution 6: Enable Remote Ollama Logging

### On Remote Server:

```bash
# Check Ollama logs:
tail -f ~/.ollama/logs/server.log

# Or journalctl if using systemd:
journalctl -u ollama -f
```

### Look For:

- `connection accepted` - Good, Wolverine connected
- `context exceeded` - Model too large for VRAM
- `out of memory` - Need more RAM/VRAM
- `timeout` - Request took too long

---

## Solution 7: Test Direct Connection

### From Your Local Machine:

```bash
# Test basic connectivity:
curl -v http://<remote-ip>:11434/api/tags

# Should return: {"models":[...]}

# Test generation:
curl -v http://<remote-ip>:11434/api/generate -d '{
  "model": "qwen3.5:4b",
  "prompt": "hello",
  "stream": false
}'

# If this works but Wolverine doesn't, it's a Wolverine config issue
# If this fails, it's an Ollama/network issue
```

---

## Solution 8: Check Wolverine Config

### Verify OLLAMA_HOST:

```bash
# Check current config:
cat .env | grep OLLAMA

# Should be:
OLLAMA_HOST=http://<remote-ip>:11434

# NOT:
OLLAMA_HOST=http://localhost:11434  # Wrong for remote!
```

### Update and Restart:

```bash
# Edit .env
nano .env

# Restart Wolverine
npm run gateway
```

---

## Quick Diagnostic Script

Create `test-ollama.sh`:

```bash
#!/bin/bash

REMOTE_IP="${1:-localhost}"
PORT="${2:-11434}"
MODEL="${3:-qwen3.5:4b}"

echo "Testing Ollama at http://$REMOTE_IP:$PORT"
echo "=========================================="

# Test 1: Basic connectivity
echo -n "1. Connectivity... "
if curl -s --connect-timeout 5 "http://$REMOTE_IP:$PORT/api/tags" > /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  exit 1
fi

# Test 2: Model exists
echo -n "2. Model $MODEL exists... "
if curl -s "http://$REMOTE_IP:$PORT/api/tags" | grep -q "$MODEL"; then
  echo "✅ OK"
else
  echo "❌ NOT FOUND"
  exit 1
fi

# Test 3: Generation
echo -n "3. Generation... "
RESPONSE=$(curl -s --max-time 30 "http://$REMOTE_IP:$PORT/api/generate" -d '{
  "model": "'$MODEL'",
  "prompt": "hi",
  "stream": false
}')

if echo "$RESPONSE" | grep -q "response"; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "=========================================="
echo "All tests passed! Ollama is working."
echo "If Wolverine still fails, check OLLAMA_TIMEOUT"
```

Run it:

```bash
chmod +x test-ollama.sh
./test-ollama.sh <remote-ip> 11434 qwen3.5:4b
```

---

## Most Common Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| GPU fires up, then EOF | Timeout too short | `OLLAMA_TIMEOUT=300000` |
| Connection refused | Wrong IP/port | Check `OLLAMA_HOST` |
| Connection timeout | Firewall blocking | `ufw allow 11434/tcp` |
| Model not found | Wrong model name | Check `ollama list` |
| Out of memory | Model too large | Use smaller model or more VRAM |

---

## Expected Logs (When Working)

```
[v2] SESSION: chat_xxx | Workspace: /path/to/workspace
[2026-03-07TXX:XX:XX.XXXZ] [INFO] [v2] CHAT (native tools)
[v2] AUTO-PLAN: Injected planning scratchpad
[OllamaAdapter] Chat at http://remote-ip:11434
[OllamaAdapter] Response received: 245 tokens (prompt: 120, completion: 245)
[v2] Consciousness processing...
[v2] Response sent to user
```

---

## Still Not Working?

### Enable Debug Logging:

```bash
# In .env:
NODE_ENV=development
WOLVERINE_LOG_LEVEL=debug

# Restart and check logs for detailed error messages
```

### Check These Files:

- `~/.ollama/logs/server.log` - Remote Ollama logs
- `gateway.log` - Wolverine logs
- `dmesg | grep -i ollama` - Kernel messages

---

**Summary:** For remote Ollama, the most common fix is setting `OLLAMA_TIMEOUT=300000` in your `.env` file. If that doesn't work, work through the checklist above.
