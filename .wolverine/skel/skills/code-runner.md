---
name: Code Runner
description: "Execute code in Python, JavaScript, or Node.js. Run scripts, test functions, or process data files."
emoji: "⚡"
version: 1.0.0
---

# Code Runner Skill

Use this skill to execute code. Creates temporary files and runs them.

## Supported Languages

- **Python** - `python3` or configured python
- **JavaScript/Node** - `node`
- **Bash** - `bash` (with confirmation for destructive commands)

## Capabilities

- **Run scripts** - Execute existing code files
- **Execute snippets** - Run inline code
- **Process data** - Read files, transform, write output
- **Test code** - Run tests and report results

## Safety

- Code runs in isolated temp directory
- Workspace files can be accessed
- No network access by default
- Timeout after 60 seconds

## Trigger Phrases

- "run this code"
- "execute python"
- "run node script"
- "test this function"
- "process the file"
