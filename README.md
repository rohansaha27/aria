# Aria

A real-time voice identity playground. Speak once — Aria transforms your voice into a completely different persona.

Built for ListenHacks '26 🎵

---

## About / Description

### Inspiration

Most voice agents sound identical — flat, generic, forgettable. At a hackathon built around the future of audio, we wanted to explore a different question: **what if synthetic voice could feel personal?** What if you could hear your own words spoken back as a calm documentary narrator, an energetic radio host, a warm elderly storyteller? That question became Aria.

### What it does

Aria is a real-time voice identity playground. You speak once — Aria transforms your voice into a completely different persona. Not just the tone, but the actual words adapt to match each persona's identity and character.

**The experience**:


- **Pick a persona:** Calm Narrator, Radio Host, Elder Storyteller, or Playful Kid

- **Hear your words transformed** — different age, tone, emotion, phrasing
- A live **120-spike SVG audio visualizer** reacts to both your input and the transformed output in real time
- **Switch personas instantly** and record again — the color, character, and voice all change

---

## How we built it

Three AI systems work in sequence on every request:

1. **Gemini 2.5 Flash** — transcribes the raw audio to text in real time
2. **Featherless (Llama 3.1 8B)** — rewrites the transcript to match the persona's identity. Calm Narrator gets formal measured phrasing. Radio Host gets punchy clipped sentences. Elder Storyteller gets warm longer sentences. The words themselves change, not just the voice.
3. **ElevenLabs eleven_multilingual_v2** — synthesizes the rewritten transcript using a custom Voice Design voice for each persona, with per-persona stability, style exaggeration, and speaking rate settings tuned to maximize the identity contrast

### Stack

- **Backend:** Next.js App Router + TypeScript
- **Frontend:** Vite + React + Tailwind, custom WebAudio + SVG visualizer
- **Voice personas:** created via ElevenLabs Voice Design with age/accent/tone prompts
- **Radio Host** has 4 accent variants: American, British, Australian, Indian

---

## Challenges we ran into

- **WebAudio's `createMediaElementSource`** can only be called once per HTML audio element — calling it again on persona switch throws an `InvalidStateError`. We fixed this by creating the source node once on mount and reusing it across all playbacks.

- **Keeping the Gemini → Featherless → ElevenLabs pipeline fast enough** to feel responsive. The round trip is 3–5 seconds which required clear processing state feedback so the UI never felt broken.

- **Stale closure bugs in React** — the persona selected at record time had to match the persona at API call time, requiring a ref-based solution.

---

## Accomplishments we're proud of

- The moment a judge hears their own words played back as four completely different identities is genuinely surprising every time
- The pipeline is **fully real** — no pre-recorded clips, no mocked responses
- The visualizer reacts to both mic input and transformed audio output through the same analyser node
- Radio Host supports **4 live accent variants** (American, British, Australian, Indian) with distinct ElevenLabs Voice Design voices

---

## What we learned

- API-first design with strong visuals beats trying to run heavy models locally on MacBook Airs
- ElevenLabs Voice Design + per-persona settings creates dramatically different perceived identities without any model training
- Featherless makes open LLM inference accessible as a drop-in OpenAI-compatible API — extremely fast to integrate

---

## What's next

- Continuous emotion and age sliders mapped to ElevenLabs style/stability controls
- **Backboard** integration for real-time streaming persona switching with interruption support
- **Amphion Vevo** integration for on-device voice conversion as an alternative to cloud TTS
- A **"compare all 4"** mode where one recording generates all 4 persona outputs simultaneously
