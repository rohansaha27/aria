import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { FinalVoiceSettings } from "./personas";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

export async function synthesizeSpeech(
  text: string,
  voiceId: string,
  settings: FinalVoiceSettings
): Promise<Buffer> {
  const stream = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    voiceSettings: {
      stability: settings.stability,
      similarityBoost: settings.similarityBoost,
      style: settings.style,
      speed: settings.speakingRate,
    },
  });

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
