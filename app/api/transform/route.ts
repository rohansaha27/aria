import { NextRequest, NextResponse } from "next/server";
import { PERSONAS } from "@/lib/personas";
import { transcribeAudio } from "@/lib/gemini";
import { synthesizeSpeech } from "@/lib/elevenlabs";

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
  const mimeType = audioFile.type || "audio/webm";
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

  let transcript: string;
  try {
    transcript = await transcribeAudio(audioBuffer, mimeType);
  } catch (err) {
    console.error("[/api/transform] Gemini transcription failed:", err);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }

  let ttsBuffer: Buffer;
  try {
    ttsBuffer = await synthesizeSpeech(transcript, persona);
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
