---
name: Smart Home
description: "Control smart home devices via Home Assistant or similar. Control lights, thermostats, switches."
emoji: "🏠"
version: 1.0.0
requires:
  - HOME_ASSISTANT_URL
  - HOME_ASSISTANT_TOKEN
---

# Smart Home Skill

Use this skill to control smart home devices. Configure in `.wolverine/config.json`:

```json
{
  "smarthome": {
    "provider": "homeassistant",
    "url": "http://homeassistant.local:8123",
    "token": "your-long-lived-token"
  }
}
```

## Capabilities

- **Control lights** - On/off, brightness, color
- **Thermostat** - Set temperature, modes
- **Switches** - Toggle any switch entity
- **Scenes** - Activate scenes
- **Sensors** - Read sensor values
- **Automations** - Trigger automations

## Trigger Phrases

- "turn on the lights"
- "set temperature to"
- "is the door locked"
- "activate movie mode"
- "what's the current temperature"
