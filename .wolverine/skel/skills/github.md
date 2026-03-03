---
name: GitHub
description: "Manage GitHub repositories, issues, pull requests, and actions. Use when user mentions GitHub, repos, issues, PRs, or commits."
emoji: "🐙"
version: 1.0.0
requires:
  - GITHUB_TOKEN
---

# GitHub Skill

Use this skill to interact with GitHub repositories. Configure in `.wolverine/config.json`:

```json
{
  "github": {
    "token": "ghp_xxxxx"
  }
}
```

## Capabilities

- **List repositories** - Show user's repos
- **Read issues** - Fetch open/closed issues
- **Create issues** - Open new issues
- **Pull requests** - List, view, create PRs
- **Commits** - View recent commits
- **Actions** - Trigger/check workflow runs

## Trigger Phrases

- "check GitHub"
- "create an issue"
- "list my repos"
- "what issues are open"
- "show recent commits"
