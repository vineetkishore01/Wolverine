---
name: Database
description: "Execute SQL queries on connected databases. Use when user wants to query data, run reports, or explore database schemas."
emoji: "🗄️"
version: 1.0.0
requires:
  - DATABASE_URL
---

# Database Skill

Use this skill to query databases. Configure in `.wolverine/config.json`:

```json
{
  "database": {
    "connection": "postgresql://user:pass@localhost:5432/mydb"
  }
}
```

## Capabilities

- **Query data** - Run SELECT queries
- **Explore schema** - List tables, columns
- **Run reports** - Generate summaries from data
- **Insert/Update** - Modify data (with confirmation)

## Safety Rules

- ALWAYS ask for confirmation before INSERT/UPDATE/DELETE
- Never drop tables or delete data without explicit permission
- Limit results to 100 rows unless asked for more

## Trigger Phrases

- "query the database"
- "show me the data"
- "what tables exist"
- "run a report"
- "check the schema"
