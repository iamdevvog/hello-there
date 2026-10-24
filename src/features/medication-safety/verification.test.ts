// SYNTHETIC, explicitly labeled test catalogue — not real verified products.
import { describe, expect, it } from "vitest";
import { analyze } from "./engine";
import { emptyMedicine, emptyProfile, type CatalogueEntry, type Medicine, type SafetyCase } from "./model";
import { fingerprintCatalogue, parseStrength, verifyMedicine } from "./verification";

const base = { source: "SYNTHETIC-TEST", reference: "https://example.org/synthetic", verifiedAt: "2026-10-01", status: "active" as const, route: "oral", aliases: [] as string[] };
const entry = (o: Partial<CatalogueEntry> & Pick<CatalogueEntry, "id" | "brand" | "ingredients" | "form">): CatalogueEntry => ({ ...base, manufacturer: "Synthetic Labs", ...o });
const CAT: CatalogueEntry[] = [
  entry({ id: "glyco500", brand: "Glycomet", ingredients: [{ name: "Metformin", strength: "500", unit: "mg" }], form: "Tablet" }),
  entry({ id: "glycosr", brand: "Glycomet SR", ingredients: [{ name: "Metformin", strength: "500", unit: "mg" }], form: "Tablet", release: "modified-release" }),
  entry({ id: "janumet", brand: "Janumet", ingredients: [{ name: "Sitagliptin", strength: "50", unit: "mg" }, { name: "Metformin", strength: "500", unit: "mg" }], form: "Tablet" }),
  entry({ id: "dolo", brand: "Dolo", ingredients: [{ name: "Paracetamol", strength: "650", unit: "mg" }], form: "Tablet" }),
  entry({ id: "dolex", brand: "Dolex", ingredients: [{ name: "Ibuprofen", strength: "650", unit: "mg" }], form: "Tablet", manufacturer: undefined }),
];
const med = (o: Partial<Medicine>): Medicine => ({ ...emptyMedicine("doc", o.id ?? "m1"), excerpt: "x", instructions: "1-0-1", ...o });
const run = (o: Partial<Medicine>, cat = CAT) => verifyMedicine(med(o), cat, "2026-10-24", "r");

describe("medicine identity verification", () => {
  it("1 exact brand, strength and form match", () => {
    const r = run({ originalName: "Tab Glycomet", strength: "500 mg", form: "tablet" });
    expect(r.status).toBe("Verified catalogue match");
    expect(r.bestCandidateId).toBe("glyco500");
  });
  it("2 brand match with wrong strength is a conflict, never verified", () => {
    const r = run({ originalName: "Dolo", strength: "500 mg", form: "tablet" });
    expect(r.status).toBe("Conflicting product details");
    expect(r.candidates[0]!.score!).toBeLessThanOrEqual(40);
  });
  it("3 similar brand names with different medicines both stay candidates", () => {
    const r = run({ originalName: "Dolo", strength: "650 mg", form: "tablet" });
    expect(r.candidates.map((c) => c.entryId)).toEqual(expect.arrayContaining(["dolo", "dolex"]));
    expect(r.candidates.find((c) => c.entryId === "dolex")!.method).toBe("Fuzzy name — candidate only");
  });
  it("4 combination medicine compares each ingredient strength", () => {
    expect(parseStrength("50/500 mg")).toHaveLength(2);
    const r = run({ originalName: "Janumet", strength: "50/500 mg", form: "tablet" });
    expect(r.candidates[0]!.attributes.find((a) => a.attribute === "Strength")!.result).toBe("match");
    const bad = run({ originalName: "Janumet", strength: "50/1000 mg", form: "tablet" });
    expect(bad.status).toBe("Conflicting product details");
  });
  it("5 unknown brand is not called counterfeit", () => {
    const r = run({ originalName: "Zyxoprin", strength: "10 mg", form: "tablet" });
    expect(r.status).toBe("Unknown brand");
    expect(JSON.stringify(r)).not.toMatch(/counterfeit(?! )|fake/i);
    expect(r.messages.join(" ")).toMatch(/does not mean the medicine is counterfeit/);
  });
  it("6 OCR spelling error yields plausible candidates needing review", () => {
    const r = run({ originalName: "Glyc0met", strength: "500 mg", form: "tablet" });
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.searchVariants).toContain("glycomet");
  });
  it("7 missing manufacturer is reported", () => {
    const r = run({ originalName: "Dolex", strength: "650 mg", form: "tablet" });
    expect(r.messages).toContain("Manufacturer information is unavailable in the current catalogue.");
  });
  it("8 immediate vs modified release mismatch is flagged", () => {
    const r = run({ originalName: "Glycomet SR", strength: "500 mg", form: "tablet" }, [CAT[0]!]);
    expect(r.candidates[0]!.disqualified).toContain("Immediate-release vs modified-release mismatch");
  });
  it("9 conflicting records from different sources are surfaced", () => {
    const other = { ...CAT[3]!, id: "dolo-b", source: "OTHER-SYNTHETIC", ingredients: [{ name: "Paracetamol", strength: "500", unit: "mg" }] };
    const r = run({ originalName: "Dolo", strength: "650 mg", form: "tablet" }, [CAT[3]!, other]);
    expect(r.conflicts.join(" ")).toMatch(/sources disagree/);
    expect(r.status).not.toBe("Verified catalogue match");
  });
  it("10 identity score not calculable without strength", () => {
    const r = run({ originalName: "Glycomet", strength: "", form: "tablet" });
    expect(r.dimensions.identity.score).toBeNull();
    expect(r.status).toBe("Insufficient evidence");
  });
  it("12 catalogue change changes the fingerprint (triggers re-verification)", () => {
    expect(fingerprintCatalogue(CAT)).not.toBe(fingerprintCatalogue([...CAT, CAT[0]!]));
  });
  it("14 prescription OCR never proves physical authenticity", () => {
    const r = run({ originalName: "Glycomet", strength: "500 mg", form: "tablet" });
    expect(r.dimensions.physical.status).toBe("Not verified");
  });
  it("15 empty catalogue means insufficient evidence, not counterfeit", () => {
    const r = run({ originalName: "Glycomet", strength: "500 mg" }, []);
    expect(r.status).toBe("Insufficient evidence");
    expect(r.catalogueAvailable).toBe(false);
  });
  it("11/13 unconfirmed identity keeps ingredient checks incomplete", () => {
    const c = { id: "c", owner: "o", patientId: null, version: 1, createdAt: "", updatedAt: "", profile: emptyProfile, prescriptions: [], medicines: [med({ originalName: "Glycomet", strength: "500 mg", verification: "unknown" })], renal: [], analyses: [], reviews: [], audit: [], reports: [], approvedVersion: null } as SafetyCase;
    const a = analyze(c, []);
    expect(a.alerts).toHaveLength(0);
    expect(a.checks.some((k) => k.status !== "completed")).toBe(true);
  });
});
