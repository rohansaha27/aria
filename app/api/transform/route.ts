import { NextRequest, NextResponse } from "next/server";
import { PERSONAS } from "@/lib/personas";
import type { AccentId, FinalVoiceSettings } from "@/lib/personas";
import { transcribeAudio } from "@/lib/gemini";
import { synthesizeSpeech } from "@/lib/elevenlabs";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseOverrideField(
  formData: FormData,
  field: string,
  min: number,
  max: number
): number | undefined {
  const raw = formData.get(field);
  if (typeof raw !== "string" || raw === "") return undefined;
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) return undefined;
  return clamp(parsed, min, max);
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  const personaId = formData.get("personaId");

  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: "Missing or invalid 'audio' field." }, { status: 400 });
  }

  if (typeof personaId !== "string" || !PERSONAS[personaId]) {
    return NextResponse.json(
      { error: `Unknown personaId. Valid values: ${Object.keys(PERSONAS).join(", ")}` },
      { status: 400 }
    );
  }

  const persona = PERSONAS[personaId];

  // Resolve voice ID — accent switching for radio_host only
  const accentRaw = formData.get("accent");
  const accent = typeof accentRaw === "string" ? accentRaw as AccentId : "american";
  const voiceId =
    persona.accentVoices?.[accent] ?? persona.elevenVoiceId;

  // Parse optional voice overrides
  const overrideStyle = parseOverrideField(formData, "style", 0, 1);
  const overrideStability = parseOverrideField(formData, "stability", 0, 1);
  const overrideSpeakingRate = parseOverrideField(formData, "speakingRate", 0.7, 1.3);

  const finalSettings: FinalVoiceSettings = {
    stability: overrideStability ?? persona.stability,
    similarityBoost: persona.similarityBoost,
    style: overrideStyle ?? persona.style,
    speakingRate: overrideSpeakingRate ?? persona.speakingRate,
  };

  const mimeType = audioFile.type || "audio/webm";
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

  let transcript: string;
  try {
    transcript = await transcribeAudio(audioBuffer, mimeType);
  } catch (err) {
    console.error("[/api/transform] Gemini transcription failed:", err);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }

  console.log(`[transform] personaId=${personaId} transcript="${transcript.slice(0, 50)}"`);

  let ttsBuffer: Buffer;
  try {
    ttsBuffer = await synthesizeSpeech(transcript, voiceId, finalSettings);
  } catch (err) {
    console.error("[/api/transform] ElevenLabs synthesis failed:", err);
    return NextResponse.json({ error: "Speech synthesis failed." }, { status: 500 });
  }

  return NextResponse.json({
    transcript,
    personaId,
    audioBase64: ttsBuffer.toString("base64"),
  });
}
