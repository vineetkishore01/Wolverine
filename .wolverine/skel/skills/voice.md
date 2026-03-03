---
name: Voice
description: "Text-to-speech and speech-to-text. Read content aloud or transcribe audio files."
emoji: "🎙️"
version: 1.0.0
requires:
  - TTS_PROVIDER
---

# Voice Skill

Use this skill for voice operations. Configure in `.wolverine/config.json`:

```json
{
  "voice": {
    "tts": {
      "provider": "elevenlabs",  // or "openai", "gtts"
      "apiKey": "xxx"
    },
    "stt": {
      "provider": "whisper",
      "apiKey": "xxx"
    }
  }
}
```

## Capabilities

- **Text to Speech** - Read text aloud
- **Speech to Text** - Transcribe audio
- **Voice messages** - Send voice responses via Telegram/Discord

## Trigger Phrases

- "read this aloud"
- "speak this"
- "transcribe"
- "convert to audio"
