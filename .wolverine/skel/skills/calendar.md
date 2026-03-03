---
name: Calendar
description: "Manage Google Calendar or CalDAV. Schedule meetings, check availability, set reminders."
emoji: "📅"
version: 1.0.0
requires:
  - GOOGLE_CALENDAR_API_KEY
  - or CALDAV_URL
---

# Calendar Skill

Use this skill to manage calendars. Configure in `.wolverine/config.json`:

```json
{
  "calendar": {
    "provider": "google",  // or "caldav"
    "credentials": "vault:calendar.credentials"
  }
}
```

## Capabilities

- **List events** - Show today's/week's events
- **Create events** - Schedule new meetings
- **Check availability** - Find free slots
- **Update events** - Modify meeting details
- **Delete events** - Cancel meetings

## Trigger Phrases

- "what's on my calendar"
- "schedule a meeting"
- "am I free tomorrow"
- "set up a call"
- "add to calendar"
