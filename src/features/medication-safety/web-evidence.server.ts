// Live web evidence for Indian medicine brands via Groq browser search.
// Every accepted product must cite URLs the search tool actually opened or returned;
// anything else is discarded. Results are evidence for professional review, never facts.
import type { CatalogueEntry, WebEvidence } from "./model";


const MODEL = "openai/gpt-oss-120b";
const PROMPT = (q: string) =>
  `You are verifying an Indian prescription medicine entry for a pharmacist. Use web search to find Indian marketed products matching: "${q}".
Prefer CDSCO, manufacturer sites, and established Indian drug directories (1mg, PharmEasy, Apollo, Practo, Medkart, drugtodayonline, pharmalist).
List up to 4 DISTINCT products (different strengths or release types are separate products). Only report facts you read on an opened page.
Reply with JSON only, no prose:
{"products":[{"brand":"","ingredients":[{"name":"","strength":"","unit":""}],"form":"","release":"immediate-release|modified-release|","manufacturer":"","marketer":"","sourceUrls":[""],"quote":"short exact text seen on the source"}]}
If nothing reliable is found, return {"products":[]}. Never guess a composition.`;

const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
};
const canon = (u: string) => u.replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase();

async function hash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).slice(0, 8).map((v) => v.toString(16).padStart(2, "0")).join("");
}

export async function searchMedicineWeb(medicineId: string, name: string, strength: string, form: string): Promise<WebEvidence> {
  const query = [name, strength, form].filter(Boolean).join(" ").slice(0, 200);
  const at = new Date().toISOString();
  const base: WebEvidence = { medicineId, query, at, model: MODEL, entries: [], visited: [], discarded: 0, error: null };
  const key = process.env["GROQ_API_KEY"];
  if (!key) return searchViaLovable(base);
  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        tools: [{ type: "browser_search" }],
        tool_choice: "required",
        temperature: 0.1,
        messages: [{ role: "user", content: PROMPT(query) }],
      }),
    });
    if (res.status !== 429 && res.status < 500) break;
  }
  if (!res || !res.ok) return searchViaLovable(base); // Groq limit/outage: use built-in Gemini search
  const body = (await res.json()) as {
    choices?: { message?: { content?: string; executed_tools?: { search_results?: { results?: { url?: string; title?: string }[] } }[] } }[];
  };
  const msg = body.choices?.[0]?.message;
  const visited = new Map<string, { url: string; title: string }>();
  for (const t of msg?.executed_tools ?? [])
    for (const r of t.search_results?.results ?? [])
      if (r.url && /^https?:\/\//.test(r.url)) visited.set(canon(r.url), { url: r.url, title: (r.title ?? "").slice(0, 200) });
  const raw = (msg?.content ?? "").match(/\{[\s\S]*\}/)?.[0];
  let products: {
    brand?: string; ingredients?: { name?: string; strength?: unknown; unit?: string }[]; form?: string; release?: string;
    manufacturer?: string; marketer?: string; sourceUrls?: string[]; quote?: string;
  }[] = [];
  try { products = (JSON.parse(raw ?? "{}") as { products?: typeof products }).products ?? []; } catch {
    return { ...base, visited: [...visited.values()].slice(0, 20), error: "Web search reply could not be read; try again." };
  }
  const entries: CatalogueEntry[] = [];
  let discarded = 0;
  for (const p of products.slice(0, 6)) {
    // Traceability gate: only URLs the search tool really returned/opened survive.
    const urls = (p.sourceUrls ?? []).filter((u) => visited.has(canon(u)));
    const ingredients = (p.ingredients ?? [])
      .filter((i) => i.name && String(i.strength ?? "").trim() && i.unit)
      .map((i) => ({ name: String(i.name).slice(0, 200), strength: String(i.strength).slice(0, 100), unit: String(i.unit).slice(0, 40) }));
    if (!p.brand || !urls.length || !ingredients.length) { discarded++; continue; }
    entries.push({
      id: `web:${await hash(`${p.brand}|${JSON.stringify(ingredients)}|${p.form}|${p.release}`)}`,
      brand: p.brand.slice(0, 200),
      aliases: [],
      ingredients,
      form: (p.form ?? "").slice(0, 100),
      route: "",
      source: `Web evidence: ${[...new Set(urls.map(host))].join(", ")}`,
      reference: urls[0]!,
      verifiedAt: at.slice(0, 10),
      retrievedAt: at.slice(0, 10),
      status: "active",
      manufacturer: p.manufacturer?.slice(0, 200) || undefined,
      marketer: p.marketer?.slice(0, 200) || undefined,
      release: p.release === "modified-release" || p.release === "immediate-release" ? p.release : undefined,
      provenance: "web",
      sourceUrls: urls.slice(0, 5),
      quote: p.quote?.slice(0, 300),
    });
  }
  return { ...base, entries, visited: [...visited.values()].slice(0, 20), discarded };
}

/** Fallback: Lovable AI Gateway Gemini with Google Search. The route returns no citation
 * metadata, so every cited URL is fetched and kept only if the page really mentions the brand. */
async function searchViaLovable(base: WebEvidence): Promise<WebEvidence> {
  const key = process.env["LOVABLE_API_KEY"];
  const model = "google/gemini-3.8-flash";
  if (!key) return { ...base, error: "Web medicine search unavailable (Groq limited and built-in AI not configured)." };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model, stream: true, tools: [{ type: "google_search" }], messages: [{ role: "user", content: PROMPT(base.query) }] }),
  });
  if (!res.ok || !res.body) {
    const msg = res.status === 402 ? "AI credits are used up; add credits in Settings → Plans & credits." : res.status === 429 ? "Web search is busy right now; try again in a minute." : `Web search unavailable (${res.status}).`;
    return { ...base, model, error: msg };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      const d = l.trim().startsWith("data:") ? l.trim().slice(5).trim() : "";
      if (!d || d === "[DONE]") continue;
      try { out += (JSON.parse(d) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content ?? ""; } catch { /* partial */ }
    }
  }
  const raw = out.match(/\{[\s\S]*\}/)?.[0];
  let products: { brand?: string; ingredients?: { name?: string; strength?: unknown; unit?: string }[]; form?: string; release?: string; manufacturer?: string; marketer?: string; sourceUrls?: string[]; quote?: string }[] = [];
  try { products = (JSON.parse(raw ?? "{}") as { products?: typeof products }).products ?? []; } catch {
    return { ...base, model, error: "Web search reply could not be read; try again." };
  }
  const visited: { url: string; title: string }[] = [];
  const checked = new Map<string, boolean>();
  const pageMentions = async (url: string, brand: string) => {
    const k = `${canon(url)}|${brand}`;
    if (checked.has(k)) return checked.get(k)!;
    let ok = false;
    try {
      if (/^https:\/\//.test(url)) {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 MediKiosk source check" }, redirect: "follow", signal: AbortSignal.timeout(5000) });
        const text = r.ok ? (await r.text()).slice(0, 400000).toLowerCase() : "";
        const word = brand.toLowerCase().split(/\s+/)[0] ?? "";
        ok = word.length > 2 && text.includes(word);
        const title = text.match(/<title[^>]*>([^<]{0,200})/)?.[1]?.trim() ?? "";
        visited.push({ url, title: ok ? title : `${title || url} (brand not found on page — discarded)` });
      }
    } catch { visited.push({ url, title: `${url} (could not be opened — discarded)` }); }
    checked.set(k, ok);
    return ok;
  };
  const entries: CatalogueEntry[] = [];
  let discarded = 0;
  for (const p of products.slice(0, 6)) {
    const ingredients = (p.ingredients ?? [])
      .filter((i) => i.name && String(i.strength ?? "").trim() && i.unit)
      .map((i) => ({ name: String(i.name).slice(0, 200), strength: String(i.strength).slice(0, 100), unit: String(i.unit).slice(0, 40) }));
    if (!p.brand || !ingredients.length) { discarded++; continue; }
    const cand = (p.sourceUrls ?? []).slice(0, 3);
    const okList = await Promise.all(cand.map((u) => pageMentions(u, p.brand!)));
    const urls = cand.filter((_, i) => okList[i]);
    if (!urls.length) { discarded++; continue; }
    entries.push({
      id: `web:${await hash(`${p.brand}|${JSON.stringify(ingredients)}|${p.form}|${p.release}`)}`,
      brand: p.brand.slice(0, 200), aliases: [], ingredients, form: (p.form ?? "").slice(0, 100), route: "",
      source: `Web evidence (page-checked): ${[...new Set(urls.map(host))].join(", ")}`,
      reference: urls[0]!, verifiedAt: base.at.slice(0, 10), retrievedAt: base.at.slice(0, 10), status: "active",
      manufacturer: p.manufacturer?.slice(0, 200) || undefined, marketer: p.marketer?.slice(0, 200) || undefined,
      release: p.release === "modified-release" || p.release === "immediate-release" ? p.release : undefined,
      provenance: "web", sourceUrls: urls, quote: p.quote?.slice(0, 300),
    });
  }
  return { ...base, model, entries, visited: visited.slice(0, 20), discarded };
}
