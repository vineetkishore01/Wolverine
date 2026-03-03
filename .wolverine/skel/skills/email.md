---
name: Email
description: "Read, send, and manage emails via IMAP/Gmail. Use proactively when user asks to send email, check inbox, summarize emails, or draft replies."
emoji: "📧"
version: 1.0.0
requires:
  - IMAP_HOST
  - IMAP_PORT
  - IMAP_USER
  - IMAP_PASSWORD
---

# Email Skill

Use this skill to manage emails via IMAP. Configure in `.wolverine/config.json`:

```json
{
  "email": {
    "imap": {
      "host": "imap.gmail.com",
      "port": 993,
      "user": "your@email.com",
      "password": "app-password"
    }
  }
}
```

## Capabilities

- **Read emails** - Fetch recent emails, search by subject/sender
- **Send emails** - Compose and send new emails
- **Summarize** - Give user a digest of important emails
- **Draft replies** - Help draft responses to emails

## Trigger Phrases

- "check my email"
- "any new emails"
- "send an email"
- "summarize my inbox"
- "draft reply to"
