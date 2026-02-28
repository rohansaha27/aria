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
    "Transcribe this audio exactly. Return only the spoken words, no labels or timestamps.",
  ]);

  return result.response.text().trim();
}
