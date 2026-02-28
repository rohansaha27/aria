import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function transcribeAudio(
  audioBytes: Buffer,
  mimeType: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: audioBytes.toString("base64"),
      },
    },
    "Transcribe this audio verbatim. Keep the exact words spoken and punctuation only when clearly audible. Do not paraphrase, normalize, or substitute words (for example morning/evening). If a word is unclear, output [unclear]. Return only the transcript text with no labels or timestamps.",
  ]);

  return result.response.text().trim();
}
