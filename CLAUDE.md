# CLAUDE.md

This file provides guidance to Claude Code (code.claude.ai) when working with code in this repository.

## Project Overview

**Aria** is a real-time web app that transforms a user's spoken voice into different accents, emotions, ages, and languages while visualizing the changes through dynamic 3D audio graphics.

- Users pick a persona (e.g. Calm Narrator, Radio Host, Elder Storyteller, Playful Kid).
- They record a short voice clip in the browser.
- The backend uses cloud AI (e.g. Gemini for transcription, ElevenLabs for TTS) to generate transformed audio.
- The frontend shows a 3D audio visualizer that responds to both the original and transformed audio.

> **Note:** This repository is in its early stages. Build system, source code, and dependencies may still be evolving. Update this CLAUDE.md as the project takes shape.

## Expected Architecture

Based on the project description, the core systems will likely include:

- **Voice input pipeline** — microphone capture and short audio stream processing.
- **Voice transformation engine** — real-time DSP + cloud AI for accent, emotion, age, and language conversion.
- **3D audio visualizations** — dynamic graphics tied to audio output (Three.js + WebAudio).
- **Web frontend** — browser-based UI connecting all components in real time (Next.js/React).

### Backend responsibilities

- Implement a main endpoint, e.g. `POST /api/transform`:
  - Accepts: short audio clip + persona ID.
  - Calls ASR (e.g. Gemini) to transcribe speech.
  - Calls TTS (e.g. ElevenLabs) with persona-specific voice + settings.
  - Returns: transcript + transformed audio (e.g. base64) + persona metadata.
- Define a persona configuration:
  - `id`, `name`, `description`
  - Voice ID (for the TTS provider)
  - Settings controlling stability / style / similarity / speed.

### Frontend responsibilities

- Single main screen:
  - Persona selector (cards).
  - Record/Stop control with clear states.
  - Transcript display ("You said / Aria says").
  - Embedded 3D audio visualizer canvas.

## Development Setup

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Environment variables** — copy `.env.local` and fill in your keys:
```
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
```

**Quick API test** (requires a real audio file and valid API keys):
```bash
curl -X POST http://localhost:3000/api/transform \
  -F "audio=@sample.mp3" \
  -F "personaId=calm_narrator" | jq .
# → { "transcript": "...", "personaId": "calm_narrator", "audioBase64": "..." }
```

## Key Technical Considerations

- Real-time or near-real-time audio will require low-latency pipelines (Web Audio API, WebRTC, or native audio libs).
- Voice transformation should rely on cloud ML models; track model sizes, loading strategies, and inference latency early.
- 3D visualization should synchronize tightly with audio output timing.
- Browser compatibility for audio APIs (getUserMedia, AudioWorklet, etc.) should be verified early.

## Workflow Orchestration for Claude Code

### 1. Plan First

- For any non-trivial task (3+ steps or architectural decisions), enter **plan mode**:
  - Outline files to touch and API contracts.
  - Keep plans concise but explicit.

### 2. Subagent Strategy

- Use subagents to keep the main context clean when doing research or large refactors.
- One focused task per subagent.

### 3. Self-Improvement Loop

- After any user correction, add a brief note to `tasks/lessons.md` (if present).
- Use these lessons to avoid repeating mistakes.

### 4. Verification Before Done

- Never mark a task complete without proving it works.
- For backend:
  - Provide at least one example request/response.
- For frontend:
  - Ensure app builds and page loads without runtime errors.

### 5. Demand Elegance (Balanced)

- For non-trivial changes, pause and ask: "Is there a simpler, more elegant way?"
- Do not over-engineer obvious fixes; prioritize clarity.

### 6. Autonomous Bug Fixing

- When a bug is reported, identify the root cause and propose a minimal, correct fix.
- Point to logs or failing behavior before and after the change when possible.

## Task Management Conventions

If the repo uses `tasks/todo.md` and `tasks/lessons.md`:

1. **Plan**: Add checkable items for larger tasks to `tasks/todo.md`.
2. **Track**: Mark items complete as work progresses.
3. **Explain**: Summarize major changes in the PR or the task file.
4. **Capture Lessons**: Log recurring patterns and fixes in `tasks/lessons.md`.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimize new code and moving parts.
- **No Laziness**: Prefer root-cause fixes over temporary hacks.
- **Minimal Impact**: Only touch what is necessary; avoid introducing regressions.
