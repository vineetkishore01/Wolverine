---
name: Image Generator
description: "Generate images using DALL-E or Stable Diffusion. Create visuals, logos, diagrams from descriptions."
emoji: "🎨"
version: 1.0.0
requires:
  - OPENAI_API_KEY
  - or LOCAL_IMAGE_MODEL
---

# Image Generator Skill

Use this skill to generate images. Configure in `.wolverine/config.json`:

```json
{
  "image": {
    "provider": "openai",  // or "local"
    "model": "dall-e-3",
    "apiKey": "sk-xxx"
  }
}
```

## Capabilities

- **Generate images** - Create from text descriptions
- **Variations** - Create variations of existing images
- **Edit images** - Modify with inpainting
- **Logos** - Design simple logos
- **Diagrams** - Create flowcharts, diagrams

## Tips

- Be specific in descriptions
- Include style (photorealistic, cartoon, abstract)
- Mention dimensions if important

## Trigger Phrases

- "generate an image"
- "create a logo"
- "make a diagram"
- "draw this"
- "visualize"
