import { Persona } from "./personas";

export async function rewriteForPersona(
  transcript: string,
  persona: Persona
): Promise<string> {
  if (!transcript.trim()) return transcript;

  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey) {
    console.warn("[featherless] missing API key, falling back");
    return transcript;
  }

  try {
    const response = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
        temperature: 0.7,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "You are a voice persona director for an app called Aria. Rewrite the transcript to match the persona identity. Keep the exact same meaning. Only change phrasing, energy, word choice and sentence structure. The output must not be identical to the input unless the input is a single short fragment. Return ONLY the rewritten text. No explanations, no labels, no quotes.",
          },
          {
            role: "user",
            content: `Persona: ${persona.name}\nCharacter: ${persona.description}\n\nOriginal: ${transcript}\n\nRewrite to sound natural for this persona. Same meaning, same length, different voice identity.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn("[featherless] API error, falling back:", response.status);
      return transcript;
    }

    const data = await response.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    if (!rewritten) {
      console.warn("[featherless] empty response, falling back");
      return transcript;
    }

    return rewritten;
  } catch (err) {
    console.warn("[featherless] failed, falling back to original:", err);
    return transcript;
  }
}
