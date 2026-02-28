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
  console.log("[transform] received personaId:", personaId);

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

  // Strip codec params — Gemini only accepts bare MIME types (e.g. "audio/webm", not "audio/webm;codecs=opus")
  const mimeType = (audioFile.type || "audio/webm").split(";")[0].trim();
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

  console.log(`[transform] personaId=${personaId} mimeType=${mimeType} bytes=${audioBuffer.length}`);

  let transcript: string;
  try {
    transcript = await transcribeAudio(audioBuffer, mimeType);
  } catch (err) {
    console.error("[transform] Gemini transcription failed:", err);
    // Never 500 — return a 200 with error field so the frontend can show a friendly message
    return NextResponse.json({ error: "Transcription failed. Try speaking again." });
  }

  console.log(`[transform] transcript="${transcript.slice(0, 80)}"`);

  let ttsBuffer: Buffer;
  try {
    ttsBuffer = await synthesizeSpeech(transcript, voiceId, finalSettings);
  } catch (err) {
    console.error("[transform] ElevenLabs synthesis failed:", err);
    // Return transcript even if audio fails — frontend shows "Something went wrong"
    return NextResponse.json({ error: "Voice synthesis failed. Try again." });
  }

  return NextResponse.json({
    transcript,
    personaId,
    audioBase64: ttsBuffer.toString("base64"),
  });
}
