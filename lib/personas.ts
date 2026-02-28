export interface Persona {
  id: string;
  name: string;
  description: string;
  elevenVoiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speakingRate?: number;
  accentVoices?: Partial<Record<AccentId, string>>;
}

export type VoiceOverrides = {
  style?: number;        // 0–1
  stability?: number;    // 0–1
  speakingRate?: number; // 0.7–1.3
}

export type FinalVoiceSettings = {
  stability: number;
  similarityBoost: number;
  style: number;
  speakingRate?: number;
}

export type AccentId = "american" | "british" | "australian" | "indian"

export const PERSONAS: Record<string, Persona> = {
  calm_narrator: {
    id: "calm_narrator",
    name: "Calm Narrator",
    description: "A measured, soothing voice ideal for storytelling and narration.",
    elevenVoiceId: "wLOfTh9wT8nrLnLqxfd5",
    stability: 0.80,
    similarityBoost: 0.75,
    style: 0.05,
  },
  radio_host: {
    id: "radio_host",
    name: "Radio Host",
    description: "Energetic and punchy, like a live FM broadcast.",
    elevenVoiceId: "OQZFQwxzrAUxV46LjHx1",
    stability: 0.55,
    similarityBoost: 0.8,
    style: 0.22,
    speakingRate: 1.03,
    accentVoices: {
      american:   "OQZFQwxzrAUxV46LjHx1", // existing voice
      british:    "Om2UWRzFN17pcwpGqlL7",
      australian: "gmBpaV0BNpfT1EqjI4Dx",
      indian:     "9yJ9vg0nUgNIvv7y2uhu",
    },
  },
  elder_storyteller: {
    id: "elder_storyteller",
    name: "Elder Storyteller",
    description: "Warm and unhurried, carrying decades of wisdom.",
    elevenVoiceId: "aJGQwZByOI8Zm1HDZTqc",
    stability: 0.65,
    similarityBoost: 0.70,
    style: 0.25,
    speakingRate: 0.85,
  },
  playful_kid: {
    id: "playful_kid",
    name: "Playful Kid",
    description: "Light, bouncy, and full of infectious enthusiasm.",
    elevenVoiceId: "7J89xXY66GnQ4VvinF4Q",
    stability: 0.45,
    similarityBoost: 0.70,
    style: 0.60,
    speakingRate: 1.10,
  },
};
