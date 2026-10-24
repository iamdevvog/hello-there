// Medicine identity verification engine (pure, deterministic, versioned).
// Measures how well a prescription entry matches a traceable catalogue record.
// It NEVER establishes physical-product authenticity.
import type { CatalogueEntry, Medicine } from "./model";

export const ALGORITHM_VERSION = "identity-match-1.0.0";
export const SCORE_LABEL = "Preliminary identity match score — not a validated probability.";
/** Weights sum to 1. Versioned with ALGORITHM_VERSION; change both together. */
export const WEIGHTS = {
  brand: 0.3,
  ingredients: 0.2,
  strength: 0.25,
  form: 0.15,
  formulation: 0.05,
  manufacturer: 0.05,
} as const;
export const CANDIDATE_THRESHOLD = 0.72; // fuzzy similarity needed to become a candidate
export const VERIFIED_THRESHOLD = 90;

export type AttributeResult = "match" | "mismatch" | "unknown";
export type AttributeName = "Brand" | "Ingredients" | "Strength" | "Dosage form" | "Formulation" | "Manufacturer" | "Evidence";
export interface AttributeCheck {
  attribute: AttributeName;
  prescription: string;
  candidate: string;
  result: AttributeResult;
  note: string;
}
export type IdentityStatus =
  | "Verified catalogue match"
  | "Strong candidate — review required"
  | "Partial match"
  | "Conflicting product details"
  | "Unknown brand"
  | "Insufficient evidence";
export const STATUS_DEFINITIONS: Record<IdentityStatus, string> = {
  "Verified catalogue match":
    "Brand, strength and dosage form agree with one traceable catalogue record with no conflicts. Not proof of current authorization, market availability or physical authenticity.",
  "Strong candidate — review required":
    "A promising record exists, but another plausible candidate, a fuzzy name match or a missing attribute means a professional must confirm.",
  "Partial match": "Some attributes agree while important information remains unresolved.",
  "Conflicting product details": "One or more important attributes (strength, ingredient, form or release type) disagree.",
  "Unknown brand": "No suitable candidate was found in the available sources. This does not mean the medicine is counterfeit.",
  "Insufficient evidence":
    "The available data or catalogue sources cannot establish a reliable identity match.",
};
export interface CandidateResult {
  entryId: string;
  entry: CatalogueEntry;
  method: "Exact brand" | "Known alias" | "Fuzzy name — candidate only";
  similarity: number; // 0..1 name similarity
  attributes: AttributeCheck[];
  score: number | null; // 0..100 or null when required inputs are missing
  disqualified: string[];
  evidenceCompleteness: number; // 0..100 share of provenance fields present
}
export type ReviewerDecision = {
  decision: "confirm" | "reject" | "unresolved" | "request-review";
  candidateId: string | null;
  actor: string;
  role: string;
  at: string;
  notes: string;
};
export interface VerificationRun {
  id: string;
  medicineId: string;
  at: string;
  algorithmVersion: string;
  weights: typeof WEIGHTS;
  catalogueFingerprint: string;
  originalName: string;
  normalizedName: string;
  searchVariants: string[];
  extracted: { strength: string; form: string; formulation: string; ingredients: string[] };
  catalogueAvailable: boolean;
  candidates: CandidateResult[];
  bestCandidateId: string | null;
  status: IdentityStatus;
  messages: string[];
  conflicts: string[];
  missing: string[];
  dimensions: {
    ocr: { label: string; detail: string };
    identity: { score: number | null; label: string };
    evidence: { score: number | null; label: string };
    physical: { status: "Not verified" | "Packaging details checked — authenticity not independently established"; detail: string };
  };
  reviewerDecisions: ReviewerDecision[];
}

/* ---------- normalization ---------- */
const FORM_WORDS: Record<string, string> = {
  tab: "tablet", tabs: "tablet", tablet: "tablet", tablets: "tablet", tb: "tablet",
  cap: "capsule", caps: "capsule", capsule: "capsule", capsules: "capsule",
  syp: "syrup", syr: "syrup", syrup: "syrup", susp: "suspension", suspension: "suspension",
  inj: "injection", injection: "injection", drop: "drops", drops: "drops", gtt: "drops",
  cream: "cream", oint: "ointment", ointment: "ointment", gel: "gel", sachet: "sachet", inhaler: "inhaler",
};
const MR_WORDS = new Set(["sr", "er", "xr", "xl", "mr", "cr", "od", "pr", "la", "retard"]);
export function clean(v: string) {
  return v.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}.]+/gu, " ").replace(/\s+/g, " ").trim();
}
export function normalizeForm(v: string) {
  const words = clean(v).split(" ");
  for (const w of words) if (FORM_WORDS[w.replace(/\./g, "")]) return FORM_WORDS[w.replace(/\./g, "")]!;
  return clean(v);
}
export function formulationOf(...texts: string[]): "modified-release" | "immediate-release" | "" {
  for (const t of texts) {
    const words = clean(t).replace(/\./g, " ").split(" ");
    if (words.some((w) => MR_WORDS.has(w)) || /modified|extended|sustained|controlled|prolonged/.test(clean(t)))
      return "modified-release";
    if (/immediate release|\bir\b/.test(clean(t))) return "immediate-release";
  }
  return "";
}
/** Search name: strips dosage-form prefixes, release suffixes and strength tokens. Original text is untouched. */
export function normalizeName(v: string) {
  return clean(v)
    .replace(/\./g, " ")
    .split(" ")
    .filter((w) => w && !FORM_WORDS[w] && !MR_WORDS.has(w) && !/^\d/.test(w) && !["mg", "mcg", "g", "ml", "iu"].includes(w))
    .join(" ");
}
const OCR_SWAPS: [RegExp, string][] = [[/0/g, "o"], [/1/g, "l"], [/5/g, "s"], [/rn/g, "m"], [/vv/g, "w"], [/8/g, "b"]];
export function searchVariants(name: string) {
  const base = normalizeName(name);
  const out = new Set([base]);
  for (const [re, to] of OCR_SWAPS) if (re.test(base)) out.add(base.replace(re, to));
  return [...out].filter(Boolean);
}

/* ---------- strength ---------- */
const UNIT: Record<string, { unit: string; factor: number }> = {
  mg: { unit: "mg", factor: 1 }, g: { unit: "mg", factor: 1000 }, gm: { unit: "mg", factor: 1000 },
  mcg: { unit: "mg", factor: 0.001 }, µg: { unit: "mg", factor: 0.001 }, ug: { unit: "mg", factor: 0.001 },
  ml: { unit: "ml", factor: 1 }, iu: { unit: "iu", factor: 1 }, "%": { unit: "%", factor: 1 },
};
export interface Quantity { value: number; unit: string; perVolume: boolean }
/** Parses "500 mg", "50/500 mg", "250mg/5ml", "1 g". Returns [] when unreadable. */
export function parseStrength(v: string): Quantity[] {
  const t = v.toLowerCase().replace(/\s+/g, "");
  if (!t) return [];
  const perVolume = /\/\d*(\.\d+)?ml/.test(t);
  const head = perVolume ? t.split(/\/(?=\d*(\.\d+)?ml)/)[0]! : t;
  const unitMatch = head.match(/(mcg|µg|ug|mg|gm|g|iu|%)/);
  if (!unitMatch) return [];
  const u = UNIT[unitMatch[1]!]!;
  const nums = head.replace(/(mcg|µg|ug|mg|gm|g|iu|%)/g, "").split(/[/+]/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return nums.map((n) => ({ value: +(n * u.factor).toFixed(6), unit: u.unit, perVolume }));
}
const qKey = (q: Quantity) => `${q.value}${q.unit}${q.perVolume ? "/vol" : ""}`;

/* ---------- similarity (Levenshtein ratio, RapidFuzz-equivalent `ratio`) ---------- */
export function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - dp[b.length]! / Math.max(a.length, b.length);
}

/* ---------- candidate evaluation ---------- */
export function evaluateCandidate(m: Medicine, e: CatalogueEntry, variants: string[]): CandidateResult | null {
  const brand = normalizeName(e.brand);
  const aliases = e.aliases.map(normalizeName);
  const exact = variants.includes(brand);
  const alias = !exact && aliases.some((a) => variants.includes(a));
  const sim = Math.max(...variants.flatMap((v) => [brand, ...aliases].map((x) => similarity(v, x))));
  if (!exact && !alias && sim < CANDIDATE_THRESHOLD) return null;
  const method = exact ? "Exact brand" : alias ? "Known alias" : "Fuzzy name — candidate only";
  const attributes: AttributeCheck[] = [];
  const disqualified: string[] = [];
  const catStrength = e.ingredients.map((i) => `${i.strength} ${i.unit}`).join(" + ");
  attributes.push({ attribute: "Brand", prescription: m.originalName, candidate: e.brand, result: exact || alias ? "match" : "unknown", note: exact || alias ? method : `Name similarity ${(sim * 100).toFixed(0)}% — not identity proof` });

  // Ingredients — only compared when the prescription explicitly lists them.
  const rxIngredients = m.ingredients.length ? m.ingredients.map((i) => clean(i.name)) : [];
  const catIngredients = e.ingredients.map((i) => clean(i.name));
  let ingredientResult: AttributeResult = "unknown";
  if (rxIngredients.length) {
    const missing = catIngredients.filter((i) => !rxIngredients.includes(i));
    const extra = rxIngredients.filter((i) => !catIngredients.includes(i));
    ingredientResult = missing.length || extra.length ? "mismatch" : "match";
    if (ingredientResult === "mismatch") disqualified.push("Ingredient composition differs from the prescription");
  }
  attributes.push({ attribute: "Ingredients", prescription: m.ingredients.map((i) => i.name).join(" + ") || "Not stated", candidate: e.ingredients.map((i) => i.name).join(" + "), result: ingredientResult, note: ingredientResult === "unknown" ? "Composition not stated on prescription; catalogue composition is unconfirmed for this entry" : e.ingredients.length > 1 ? "Each ingredient compared independently" : "" });

  // Strength
  const rx = parseStrength(m.strength);
  const cat = e.ingredients.flatMap((i) => parseStrength(`${i.strength}${i.unit}`));
  let strengthResult: AttributeResult = "unknown";
  let strengthNote = "Strength not recorded — cannot count as a match";
  if (rx.length && cat.length) {
    const rxKeys = rx.map(qKey).sort().join("|");
    const catKeys = cat.map(qKey).sort().join("|");
    const sameValues = rx.map((q) => q.value).sort().join("|") === cat.map((q) => q.value).sort().join("|");
    if (rxKeys === catKeys) { strengthResult = "match"; strengthNote = "Units normalized before comparison"; }
    else if (rx.length !== cat.length && e.ingredients.length > 1) { strengthResult = "unknown"; strengthNote = "Combination product: per-ingredient strengths not all stated"; }
    else {
      strengthResult = "mismatch";
      strengthNote = sameValues ? "Per-unit vs per-volume or unit basis differs" : "The candidate's strength differs from the prescription";
      disqualified.push(strengthNote);
    }
  } else if (m.strength && !rx.length) strengthNote = "Prescription strength could not be parsed";
  attributes.push({ attribute: "Strength", prescription: m.strength || "Not recorded", candidate: catStrength, result: strengthResult, note: strengthNote });

  // Dosage form
  let formResult: AttributeResult = "unknown";
  const rxForm = normalizeForm(m.form || m.originalName);
  const hasRxForm = Boolean(m.form) || Object.keys(FORM_WORDS).some((w) => clean(m.originalName).split(" ").includes(w));
  if (hasRxForm && e.form) {
    formResult = rxForm === normalizeForm(e.form) ? "match" : "mismatch";
    if (formResult === "mismatch") disqualified.push("Dosage form differs");
  }
  attributes.push({ attribute: "Dosage form", prescription: m.form || "Not recorded", candidate: e.form || "Not in catalogue", result: formResult, note: "" });

  // Formulation (IR vs MR)
  const rxRel = formulationOf(m.originalName, m.form, m.strength);
  const catRel = e.release || formulationOf(e.brand, e.form);
  let relResult: AttributeResult = "unknown";
  if (rxRel || catRel) {
    const a = rxRel || "immediate-release", b = catRel || "immediate-release";
    relResult = a === b ? "match" : "mismatch";
    if (relResult === "mismatch") disqualified.push("Immediate-release vs modified-release mismatch");
  }
  attributes.push({ attribute: "Formulation", prescription: rxRel || "Not specified", candidate: catRel || "Not specified", result: relResult, note: "" });

  attributes.push({ attribute: "Manufacturer", prescription: "Not on prescription", candidate: e.manufacturer || e.marketer || "Unavailable in current catalogue", result: "unknown", note: e.manufacturer ? "Corroborating only — not proof of authenticity" : "Manufacturer information is unavailable in the current catalogue." });
  attributes.push({ attribute: "Evidence", prescription: `Page ${m.page}: ${m.excerpt || "no excerpt"}`, candidate: `${e.source}${e.sourceId ? ` #${e.sourceId}` : ""}`, result: e.reference ? "match" : "unknown", note: `Verified ${e.verifiedAt}` });

  const evidenceFields = [e.source, e.reference, e.verifiedAt, e.manufacturer, e.productId, e.retrievedAt, e.form, e.ingredients.length ? "x" : ""];
  const evidenceCompleteness = Math.round((evidenceFields.filter(Boolean).length / evidenceFields.length) * 100);

  // Score: missing strength makes identity uncomputable. Unknown counts 0, never as match.
  let score: number | null = null;
  if (rx.length) {
    const v = (r: AttributeResult) => (r === "match" ? 1 : 0);
    const brandPart = exact ? 1 : alias ? 0.95 : sim * 0.8;
    const raw =
      WEIGHTS.brand * brandPart +
      WEIGHTS.ingredients * v(ingredientResult === "unknown" && (exact || alias) && strengthResult === "match" ? "match" : ingredientResult) +
      WEIGHTS.strength * v(strengthResult) +
      WEIGHTS.form * v(formResult) +
      WEIGHTS.formulation * (relResult === "mismatch" ? 0 : 1) +
      WEIGHTS.manufacturer * (e.manufacturer ? 1 : 0);
    score = Math.round(raw * 100);
    if (disqualified.length) score = Math.min(score, 40); // conflicts can never reach a verified tier
  }
  return { entryId: e.id, entry: e, method, similarity: +sim.toFixed(3), attributes, score, disqualified, evidenceCompleteness };
}

export function fingerprintCatalogue(catalogue: CatalogueEntry[]) {
  let h = 0;
  const s = JSON.stringify(catalogue);
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${catalogue.length}:${(h >>> 0).toString(16)}`;
}

export function verifyMedicine(m: Medicine, catalogue: CatalogueEntry[], at: string, id: string): VerificationRun {
  const variants = searchVariants(m.originalName);
  const results = catalogue
    .map((e) => evaluateCandidate(m, e, variants))
    .filter((r): r is CandidateResult => r !== null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.similarity - a.similarity)
    .slice(0, 8);
  const messages: string[] = [];
  const conflicts: string[] = [];
  const missing: string[] = [];
  if (!m.strength) missing.push("Strength");
  if (!m.form) missing.push("Dosage form");
  if (!m.ingredients.length) missing.push("Active ingredients (not stated on prescription)");

  // Conflicting records across sources: same brand, different composition.
  const byBrand = new Map<string, CandidateResult[]>();
  for (const r of results) {
    const k = normalizeName(r.entry.brand);
    byBrand.set(k, [...(byBrand.get(k) ?? []), r]);
  }
  for (const [brand, list] of byBrand) {
    const comps = new Set(list.map((r) => r.entry.ingredients.map((i) => `${clean(i.name)}${i.strength}${i.unit}`).sort().join("+")));
    if (comps.size > 1) conflicts.push(`Catalogue sources disagree on the composition of "${brand}" (${list.map((r) => r.entry.source).join(" vs ")})`);
  }
  const best = results[0] ?? null;
  let status: IdentityStatus;
  if (!catalogue.length) {
    status = "Insufficient evidence";
    messages.push("Catalogue source unavailable — evidence could not be retrieved. Unable to verify this medicine from the available sources.");
  } else if (!results.length) {
    status = "Unknown brand";
    messages.push("Unable to verify this medicine from the available sources. Absence from the catalogue does not mean the medicine is counterfeit.");
  } else if (best!.score === null) {
    status = "Insufficient evidence";
    messages.push("Identity score cannot be calculated: the prescription strength is missing or unreadable.");
  } else if (best!.disqualified.length && results.every((r) => r.disqualified.length)) {
    status = "Conflicting product details";
    conflicts.push(...best!.disqualified);
  } else {
    const plausible = results.filter((r) => !r.disqualified.length && (r.score ?? 0) >= 60);
    const top = plausible[0] ?? best!;
    if (plausible.length > 1) messages.push("Multiple candidate products were found.");
    const webOnly = top.entry.provenance === "web";
    if (webOnly) messages.push("Evidence comes from web pharmacy/drug-directory pages, not a regulatory record. A pharmacist must confirm.");
    if (conflicts.length || webOnly) status = (top.score ?? 0) >= 60 ? "Strong candidate — review required" : "Partial match";
    if (conflicts.length || webOnly) {}
    else if (plausible.length === 1 && top.method !== "Fuzzy name — candidate only" && (top.score ?? 0) >= VERIFIED_THRESHOLD && top.attributes.find((a) => a.attribute === "Dosage form")?.result === "match")
      status = "Verified catalogue match";
    else if ((top.score ?? 0) >= 60) status = "Strong candidate — review required";
    else status = "Partial match";
    if (top.attributes.find((a) => a.attribute === "Ingredients")?.result === "unknown") messages.push("Ingredient composition requires confirmation.");
    if (!top.entry.manufacturer) messages.push("Manufacturer information is unavailable in the current catalogue.");
    if (top !== best) results.splice(results.indexOf(top), 1), results.unshift(top);
  }
  messages.push("Physical product authenticity has not been established.");
  const lead = results[0] ?? null;
  const ocrUnc = m.uncertainty.filter((u) => !/identity requires verification/i.test(u));
  return {
    id,
    medicineId: m.id,
    at,
    algorithmVersion: ALGORITHM_VERSION,
    weights: WEIGHTS,
    catalogueFingerprint: fingerprintCatalogue(catalogue),
    originalName: m.originalName,
    normalizedName: normalizeName(m.originalName),
    searchVariants: variants,
    extracted: { strength: m.strength, form: m.form, formulation: formulationOf(m.originalName, m.form), ingredients: m.ingredients.map((i) => i.name) },
    catalogueAvailable: catalogue.length > 0,
    candidates: results,
    bestCandidateId: lead && status !== "Unknown brand" ? lead.entryId : null,
    status,
    messages,
    conflicts,
    missing,
    dimensions: {
      ocr: {
        label: ocrUnc.length ? "Needs confirmation" : m.excerpt ? "Text located in source" : "No source excerpt",
        detail: ocrUnc.length ? ocrUnc.join("; ") : "OCR engine does not supply per-word confidence; excerpt matched to the source text.",
      },
      identity: { score: lead?.score ?? null, label: SCORE_LABEL },
      evidence: { score: lead ? lead.evidenceCompleteness : null, label: "Share of provenance fields present in the catalogue record" },
      physical: { status: "Not verified", detail: "Prescription OCR cannot establish whether a dispensed product is genuine. Never averaged with the other dimensions." },
    },
    reviewerDecisions: [],
  };
}

export function latestRun(runs: VerificationRun[] | undefined, medicineId: string) {
  return (runs ?? []).filter((r) => r.medicineId === medicineId).at(-1) ?? null;
}
