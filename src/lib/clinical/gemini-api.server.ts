/** Direct Google API only; no hosting-platform credentials or gateway fallback. */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

export async function generateGeminiJson(
  prompt: string,
  responseSchema: Record<string, unknown>,
  systemInstruction: string,
): Promise<{ text: string; model: string }> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("Gemini is not configured. Set GEMINI_API_KEY on the server.");
  const model = process.env["GEMINI_MODEL"]?.trim() || DEFAULT_GEMINI_MODEL;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema },
  });
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (!response.ok) {
      if (response.status === 429)
        throw new Error("Gemini quota reached. Check your Google AI Studio quota or billing, then retry; saved source text is unchanged.");
      if (response.status === 401 || response.status === 403)
        throw new Error("Gemini access was rejected. Check the server API key and Google API permissions.");
      if (response.status === 404)
        throw new Error("Gemini model is unavailable. Set GEMINI_MODEL to a model supported by your Google account.");
      throw new Error(`Gemini is temporarily unavailable (${response.status}). Please retry; saved source text is unchanged.`);
    }
    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text.trim()) throw new Error("Gemini returned no readable result. Source text remains available for review.");
    return { text, model };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))
      throw new Error("Gemini reading took too long. Please retry; saved source text is unchanged.");
    throw error;
  }
}