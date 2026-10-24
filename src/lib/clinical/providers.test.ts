import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateGeminiJson } from "./gemini-api.server";
import { extractMedicines } from "@/features/medication-safety/prescription-extraction.server";
import { searchMedicineWeb } from "@/features/medication-safety/web-evidence.server";

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "synthetic-test-credential");
  vi.stubEnv("GEMINI_MODEL", "gemini-flash-latest");
  vi.stubEnv("GROQ_API_KEY", "synthetic-test-credential");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const geminiReply = (data: unknown) => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] });
const medicine = {
  originalName: "Dolo", strength: "650 mg", form: null, instructions: null,
  route: null, frequency: null, timing: null, duration: null, startDate: null,
  endDate: null, page: 1, excerpt: "Dolo 650 mg", uncertainty: ["Form not stated"],
};

describe("independent hosting providers", () => {
  it("uses Google directly with a server-only key header", async () => {
    const request = vi.fn().mockResolvedValue(geminiReply({ ok: true }));
    vi.stubGlobal("fetch", request);
    await generateGeminiJson("synthetic input", { type: "OBJECT" }, "preserve source");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent");
    expect(request.mock.calls[0]?.[1].headers["x-goog-api-key"]).toBe("synthetic-test-credential");
  });
  it("does not fall back to Lovable after Google quota failure", async () => {
    const request = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", request);
    await expect(extractMedicines("Dolo 650 mg")).rejects.toThrow("Gemini quota reached");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("retains literal strengths, unknown form and extraction uncertainty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiReply({ medicines: [medicine] })));
    const result = await extractMedicines("Dolo 650 mg");
    expect(result.medicines[0]?.strength).toBe("650 mg");
    expect(result.medicines[0]?.form).toBeNull();
    expect(result.medicines[0]?.uncertainty).toEqual(["Form not stated"]);
  });
  it("rejects invented prescription evidence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiReply({ medicines: [medicine] })));
    await expect(extractMedicines("Unrelated source")).rejects.toThrow("did not match the source");
  });
  it("missing Groq produces no search calls or invented medicine entries", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    const result = await searchMedicineWeb("synthetic-id", "Dolo", "650 mg", "");
    expect(request).not.toHaveBeenCalled();
    expect(result.entries).toEqual([]);
    expect(result.error).toContain("not configured");
  });
  it("rejects medicine citations not returned by Groq search", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: {
      content: JSON.stringify({ products: [{ brand: "Dolo", ingredients: [{ name: "Paracetamol", strength: "650", unit: "mg" }], sourceUrls: ["https://unreturned.example/medicine"] }] }),
      executed_tools: [{ search_results: { results: [{ url: "https://returned.example/medicine", title: "Medicine source" }] } }],
    } }] }));
    vi.stubGlobal("fetch", request);
    const result = await searchMedicineWeb("synthetic-id", "Dolo", "650 mg", "");
    expect(result.entries).toHaveLength(0);
    expect(result.discarded).toBe(1);
    expect(request.mock.calls[0]?.[0]).toBe("https://api.groq.com/openai/v1/chat/completions");
  });
  it("Groq access failures stay unavailable without any other provider calls", async () => {
    const request = vi.fn().mockResolvedValue(new Response("", { status: 403 }));
    vi.stubGlobal("fetch", request);
    const result = await searchMedicineWeb("synthetic-id", "Dolo", "650 mg", "");
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.entries).toEqual([]);
    expect(result.error).toContain("unavailable");
  });
});