import { auth } from "@clerk/tanstack-react-start/server";
import { z } from "zod";
import { db } from "@/lib/clinical/clinical.server";
import { runOcr } from "@/lib/clinical/ocr.server";
import { analyze, reportLines, ruleSchema } from "./engine";
import { fingerprintCatalogue, latestRun, verifyMedicine } from "./verification";
import { searchMedicineWeb } from "./web-evidence.server";
import { extractMedicines } from "./prescription-extraction.server";
export { extractMedicines } from "./prescription-extraction.server";
import {
  catalogueSchema,
  candidates,
  canAccess,
  emptyMedicine,
  isProfessional,
  medicineSchema,
  profileSchema,
  renalSchema,
  validateUpload,
  type CatalogueEntry,
  type Profile,
  type SafetyCase,
  type Services,
} from "./model";

export async function identity() {
  const session = await auth();
  if (!session.userId) throw new Error("Sign in to access prescription records");
  let configured: Record<string, string> = {};
  try {
    configured = JSON.parse(process.env["MEDICATION_PROFESSIONAL_ROLES"] || "{}");
  } catch {
    throw new Error("Professional authorization configuration is invalid");
  }
  const role = configured[session.userId] || "patient";
  return { id: session.userId, role, professional: isProfessional(role) };
}
export async function safetyDb() {
  const client = await db();
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS medication_safety_cases (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, patient_id TEXT REFERENCES patients(id), version INTEGER NOT NULL CHECK(version > 0), body TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS medication_safety_owner ON medication_safety_cases(owner_id, updated_at)`,
      `CREATE TABLE IF NOT EXISTS medication_safety_access (case_id TEXT NOT NULL REFERENCES medication_safety_cases(id) ON DELETE CASCADE, user_id TEXT NOT NULL, granted_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(case_id,user_id))`,
      `CREATE TABLE IF NOT EXISTS medication_safety_files (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES medication_safety_cases(id) ON DELETE CASCADE, mime TEXT NOT NULL, bytes BLOB NOT NULL, digest TEXT NOT NULL, UNIQUE(case_id,digest))`,
      `CREATE TABLE IF NOT EXISTS medication_safety_versions (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES medication_safety_cases(id) ON DELETE CASCADE, version INTEGER NOT NULL, body TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, UNIQUE(case_id,version))`,
    ],
    "write",
  );
  return client;
}
export async function sources() {
  let catalogue: CatalogueEntry[] = [];
  let rules: z.infer<typeof ruleSchema>[] = [];
  // Versioned, operator-provisioned licensed datasets only. Empty means unavailable, never an AI fallback.
  if (process.env["MEDICATION_CATALOGUE_JSON"])
    catalogue = z
      .array(catalogueSchema)
      .parse(JSON.parse(process.env["MEDICATION_CATALOGUE_JSON"] || "[]"));
  if (process.env["MEDICATION_RULES_JSON"])
    rules = z.array(ruleSchema).parse(JSON.parse(process.env["MEDICATION_RULES_JSON"] || "[]"));
  return { catalogue, rules };
}
export async function services(): Promise<Services> {
  const actor = await identity();
  const s = await sources();
  return {
    catalogue: s.catalogue.length > 0,
    webEvidence: Boolean(process.env["GROQ_API_KEY"]),
    rules: s.rules.length > 0,
    ocr: Boolean(process.env["OCR_SPACE_API_KEY"]),
    extraction: Boolean(process.env["GEMINI_API_KEY"]),
    externalProcessingApproved: process.env["MEDICATION_EXTERNAL_PROCESSING_APPROVED"] === "true",
    professional: actor.professional,
    role: actor.role,
  };
}
export async function loadCase(id: string) {
  const actor = await identity();
  const client = await safetyDb();
  const result = await client.execute({
    sql: "SELECT body,owner_id FROM medication_safety_cases WHERE id=?",
    args: [id],
  });
  const row = result.rows[0];
  if (!row) throw new Error("Case unavailable");
  if (!canAccess(String(row["owner_id"]), actor.id)) {
    const grant = await client.execute({
      sql: "SELECT user_id FROM medication_safety_access WHERE case_id=? AND user_id=?",
      args: [id, actor.id],
    });
    if (!actor.professional || !grant.rows.length)
      throw new Error("You are not authorized to access this case");
  }
  return { c: JSON.parse(String(row["body"])) as SafetyCase, actor, client };
}
async function sourceFingerprint(){const s=await sources();return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(s))))).map(v=>v.toString(16).padStart(2,"0")).join("");}
async function assertCurrentAnalysis(c:SafetyCase){const a=c.analyses.at(-1);if(!a)throw new Error("Run analysis first");const index=c.audit.map(e=>e.action==="Safety analysis"||e.action==="Renal measurement and re-evaluation").lastIndexOf(true);if(index<0 || c.audit.slice(index+1).some(e=>!["Professional review","Report generated"].includes(e.action)) || a.sourceFingerprint!==await sourceFingerprint())throw new Error("Patient data or knowledge sources changed. Re-run safety analysis before review or report generation.");}
function verifyIdentities(c: SafetyCase, catalogue: CatalogueEntry[], ids?: string[], force = false) {
  c.verifications ??= [];
  for (const m of c.medicines) {
    if (ids && !ids.includes(m.id)) continue;
    const fp = fingerprintCatalogue([...catalogue, ...(c.webEvidence?.[m.id]?.entries ?? [])]);
    const prev = latestRun(c.verifications, m.id);
    if (!force && prev && prev.catalogueFingerprint === fp && prev.originalName === m.originalName) continue;
    const pool = [...catalogue, ...(c.webEvidence?.[m.id]?.entries ?? [])];
    c.verifications.push(verifyMedicine(m, pool, new Date().toISOString(), crypto.randomUUID()));
  }
}
async function refreshCatalogueIdentities(c: SafetyCase) {
  const { catalogue } = await sources();
  verifyIdentities(c, catalogue);
  for (const m of c.medicines) {
    if (m.verification !== "verified") continue;
    const entry = [...catalogue, ...(c.webEvidence?.[m.id]?.entries ?? [])].find((e) => e.id === m.catalogueId);
    if (!entry || JSON.stringify(entry.ingredients) !== JSON.stringify(m.ingredients)) {
      m.verification = "unknown";
      m.ingredients = [];
      m.catalogueId = null;
      m.evidence = "";
      m.uncertainty.push("Source record changed or became unavailable; professional re-verification required");
    }
  }
}
async function save(
  c: SafetyCase,
  actor: string,
  action: string,
  detail: string,
  expected: number,
) {
  const client = await safetyDb();
  const at = new Date().toISOString();
  c.version = expected + 1;
  c.updatedAt = at;
  c.audit.push({ id: crypto.randomUUID(), at, actor, action, detail });
  const tx = await client.transaction("write");
  try {
    const updated = await tx.execute({
      sql: "UPDATE medication_safety_cases SET body=?,version=?,updated_at=? WHERE id=? AND version=?",
      args: [JSON.stringify(c), c.version, at, c.id, expected],
    });
    if (updated.rowsAffected !== 1)
      throw new Error("This case changed in another session. Refresh before saving.");
    await tx.execute({
      sql: "INSERT INTO medication_safety_versions(id,case_id,version,body,actor,at) VALUES(?,?,?,?,?,?)",
      args: [crypto.randomUUID(), c.id, c.version, JSON.stringify(c), actor, at],
    });
    await tx.commit();
    return c;
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
export async function listCases() {
  const actor = await identity();
  const client = await safetyDb();
  const result = await client.execute({
    sql: "SELECT c.id,c.body,c.updated_at FROM medication_safety_cases c WHERE c.owner_id=? OR (?=1 AND EXISTS(SELECT 1 FROM medication_safety_access a WHERE a.case_id=c.id AND a.user_id=?)) ORDER BY c.updated_at DESC LIMIT 100",
    args: [actor.id, actor.professional ? 1 : 0, actor.id],
  });
  return result.rows.map((r) => {
    const c = JSON.parse(String(r["body"])) as SafetyCase;
    return {
      id: c.id,
      identifier: c.profile.identifier,
      version: c.version,
      updatedAt: c.updatedAt,
    };
  });
}
export async function createCase(profile: Profile) {
  const actor = await identity();
  const client = await safetyDb();
  const p = profileSchema.parse(profile);
  const id = crypto.randomUUID(),
    at = new Date().toISOString();
  const patients = await client.execute({
    sql: "SELECT id FROM patients WHERE account_id=? LIMIT 1",
    args: [actor.id],
  });
  const c: SafetyCase = {
    id,
    owner: actor.id,
    patientId: patients.rows[0] ? String(patients.rows[0]["id"]) : null,
    version: 1,
    createdAt: at,
    updatedAt: at,
    profile: p,
    prescriptions: [],
    medicines: [],
    renal: [],
    analyses: [],
    reviews: [],
    audit: [
      {
        id: crypto.randomUUID(),
        at,
        actor: actor.id,
        action: "Case created",
        detail: "Patient context recorded",
      },
    ],
    reports: [],
    approvedVersion: null,
  };
  await client.batch(
    [
      {
        sql: "INSERT INTO medication_safety_cases(id,owner_id,patient_id,version,body,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
        args: [id, actor.id, c.patientId, 1, JSON.stringify(c), at, at],
      },
      {
        sql: "INSERT INTO medication_safety_versions(id,case_id,version,body,actor,at) VALUES(?,?,?,?,?,?)",
        args: [crypto.randomUUID(), id, 1, JSON.stringify(c), actor.id, at],
      },
    ],
    "write",
  );
  return c;
}
export async function updateProfile(id: string, profile: Profile, version: number) {
  const { c, actor } = await loadCase(id);
  if (c.version !== version) throw new Error("Refresh this changed case");
  c.profile = profileSchema.parse(profile);
  c.approvedVersion = null;
  return save(
    c,
    actor.id,
    "Patient context updated",
    "Previous context preserved in version history",
    version,
  );
}
export async function upload(
  id: string,
  input: {
    name: string;
    mime: string;
    base64: string;
    label: string;
    prescriber: string;
    date: string;
    clinic: string;
  },
  version: number,
) {
  const { c, actor, client } = await loadCase(id);
  if (c.version !== version) throw new Error("Refresh this changed case");
  if (input.base64.length > 1400000) throw new Error("Each file must be at most 1 MB");
  const bytes = Uint8Array.from(atob(input.base64), (x) => x.charCodeAt(0));
  validateUpload(bytes, input.mime);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  if (c.prescriptions.some((p) => p.digest === digest))
    throw new Error("This prescription is already attached to this case");
  const fileId = crypto.randomUUID();
  c.prescriptions.push({
    id: fileId,
    name: input.name,
    mime: input.mime,
    size: bytes.length,
    digest,
    label: input.label,
    prescriber: input.prescriber,
    date: input.date,
    clinic: input.clinic,
    status: "Uploaded",
    error: null,
    rawText: "",
    pages: 0,
    createdAt: new Date().toISOString(),
  });
  c.approvedVersion = null;
  await client.execute({
    sql: "INSERT INTO medication_safety_files(id,case_id,mime,bytes,digest) VALUES(?,?,?,?,?)",
    args: [fileId, id, input.mime, bytes, digest],
  });
  try {
    return await save(c, actor.id, "Prescription uploaded", `Document ${fileId}`, version);
  } catch (e) {
    await client.execute({
      sql: "DELETE FROM medication_safety_files WHERE id=? AND case_id=?",
      args: [fileId, id],
    });
    throw e;
  }
}
export async function processPrescriptionFile(id: string, documentId: string) {
  let { c, actor, client } = await loadCase(id);
  let d = c.prescriptions.find((p) => p.id === documentId);
  if (!d) throw new Error("Prescription unavailable");
  if (d.status === "Needs Review" || d.status === "Verified") return c;
  if (d.status === "Extracting" && Date.now() - Date.parse(c.updatedAt) < 180000)
    throw new Error(
      "Extraction already running. Refresh for status; retry after three minutes if interrupted.",
    );
  if (!c.profile.consent || process.env["MEDICATION_EXTERNAL_PROCESSING_APPROVED"] !== "true")
    throw new Error(
      "External OCR and model processing is paused until patient consent and operator privacy approval are recorded",
    );
  d.status = "Extracting";
  d.error = null;
  c = await save(c, actor.id, "Extraction started", `Document ${documentId}`, c.version);
  try {
    const file = await client.execute({
      sql: "SELECT bytes FROM medication_safety_files WHERE id=? AND case_id=?",
      args: [documentId, id],
    });
    const b: unknown = file.rows[0]?.["bytes"];
    if (!(b instanceof ArrayBuffer) && !(b instanceof Uint8Array))
      throw new Error("Original file unavailable");
    const ocr = await runOcr({ bytes: new Uint8Array(b), fileName: d.name, mimeType: d.mime });
    ({ c } = await loadCase(id));
    d = c.prescriptions.find((p) => p.id === documentId);
    if (!d) throw new Error("Prescription removed during processing");
    d.rawText = ocr.rawText;
    d.pages = ocr.pageCount;
    c = await save(
      c,
      actor.id,
      "OCR completed",
      `Document ${documentId}; raw source preserved`,
      c.version,
    );
    const parsed = await extractMedicines(ocr.rawText);
    ({ c } = await loadCase(id));
    d = c.prescriptions.find((p) => p.id === documentId);
    if (!d) throw new Error("Prescription removed during processing");
    c.medicines = c.medicines.filter((m) => m.documentId !== documentId);
    for (const entry of parsed.medicines) {
      const m = emptyMedicine(documentId, crypto.randomUUID());
      m.originalName = entry.originalName;
      m.strength = entry.strength ?? "";
      m.form = entry.form ?? "";
      m.instructions = entry.instructions ?? "";
      m.route = entry.route ?? "";
      m.frequency = entry.frequency ?? "";
      m.timing = entry.timing ?? "";
      m.duration = entry.duration ?? "";
      m.excerpt = entry.excerpt;
      m.page = entry.page;
      m.uncertainty = entry.uncertainty;
      if (!ocr.rawText.includes(entry.excerpt) || !entry.excerpt.includes(entry.originalName))
        m.uncertainty.push("Extraction evidence not an exact source match");
      if (entry.page > ocr.pageCount) m.uncertainty.push("Source page could not be validated");
      for (const field of ["strength", "instructions", "frequency"] as const)
        if (m[field] && !ocr.rawText.includes(m[field]))
          m.uncertainty.push(`${field} is not a literal OCR substring`);
      for (const field of ["startDate", "endDate"] as const) {
        const value = entry[field] ?? "";
        const valid = medicineSchema.shape[field].safeParse(value);
        if (valid.success) m[field] = value;
        else m.uncertainty.push(`${field} needs date clarification`);
      }
      if (!m.strength || !m.instructions)
        m.uncertainty.push("Missing strength or instructions; human clarification needed");
      c.medicines.push(medicineSchema.parse(m));
    }
    verifyIdentities(c, (await sources()).catalogue, c.medicines.filter((m) => m.documentId === documentId).map((m) => m.id), true);
    d.status = "Needs Review";
    d.error = parsed.medicines.length
      ? null
      : "No readable medication entries found; manually transcribe from the source";
    c.approvedVersion = null;
    return await save(
      c,
      actor.id,
      "Extraction completed",
      `Gemini; schema medication-extraction-1; ${parsed.medicines.length} candidate entries`,
      c.version,
    );
  } catch (e) {
    ({ c } = await loadCase(id));
    d = c.prescriptions.find((p) => p.id === documentId);
    if (d) {
      d.status = "Failed";
      d.error = e instanceof Error ? e.message : "Prescription processing failed";
      return save(
        c,
        actor.id,
        "Extraction failed",
        `Document ${documentId}; source retained`,
        c.version,
      );
    }
    throw e;
  }
}
const modelName = "gemini-3.6-flash";
export async function correct(id: string, medicine: unknown, version: number, notes: string) {
  const { c, actor } = await loadCase(id);
  if (c.version !== version) throw new Error("Refresh this changed case");
  const m = medicineSchema.parse(medicine);
  if(m.startDate && m.endDate && m.endDate<m.startDate) throw new Error("Therapy end date cannot precede its start date");
  if (!c.prescriptions.some((d) => d.id === m.documentId))
    throw new Error("Source prescription unavailable");
  const existing = c.medicines.find((x) => x.id === m.id);
  const document=c.prescriptions.find(d=>d.id===m.documentId);
  if(document?.status === "Extracting") throw new Error("Wait for extraction to finish before correcting this source");
  if(document) document.status="Needs Review";
  if (existing && existing.documentId !== m.documentId)
    throw new Error("Source prescription cannot be reassigned");
  // Browser corrections never grant catalogue verification or change ingredients.
  m.verification = "unknown";
  m.catalogueId = null;
  m.ingredients = [];
  m.evidence = "";
  if (existing) {
    c.medicines = c.medicines.map((x) => (x.id === m.id ? m : x));
  } else c.medicines.push(m);
  verifyIdentities(c, (await sources()).catalogue, [m.id], true);
  c.approvedVersion = null;
  return save(
    c,
    actor.id,
    "Extraction correction",
    `${m.id}; ${notes}; prior fields retained in version history`,
    version,
  );
}
export async function resolve(id: string, medicineId: string) {
  const { c: first, actor } = await loadCase(id);
  let fresh = first;
  const m = first.medicines.find((m) => m.id === medicineId);
  if (!m) throw new Error("Medicine unavailable");
  if (!first.profile.consent || process.env["MEDICATION_EXTERNAL_PROCESSING_APPROVED"] !== "true")
    throw new Error("Web medicine search needs patient consent and operator approval for external processing");
  // Only the medicine name/strength/form leave MediKiosk — never patient details.
  const evidence = await searchMedicineWeb(m.id, m.originalName, m.strength, m.form);
  ({ c: fresh } = await loadCase(id));
  const c = fresh;
  c.webEvidence = { ...(c.webEvidence ?? {}), [medicineId]: evidence };
  verifyIdentities(c, (await sources()).catalogue, [medicineId], true);
  return save(c, actor.id, "Identity verification run", `${medicineId}; web search ${evidence.error ? "failed: " + evidence.error : `${evidence.entries.length} sourced products, ${evidence.discarded} unsourced discarded`}; prior runs retained`, c.version);
}
export async function confirm(
  id: string,
  medicineId: string,
  catalogueId: string | null,
  decision: "confirm" | "reject" | "unresolved" | "request-review",
  notes: string,
  version: number,
) {
  const { c, actor } = await loadCase(id);
  if (!actor.professional && decision !== "request-review")
    throw new Error("A configured clinician or pharmacist must verify medicine identity");
  if (c.version !== version) throw new Error("Refresh this changed case");
  const m = c.medicines.find((m) => m.id === medicineId);
  if (!m) throw new Error("Medicine unavailable");
  const { catalogue } = await sources();
  verifyIdentities(c, catalogue, [medicineId]);
  const run = latestRun(c.verifications, medicineId);
  if (decision === "confirm") {
    const entry = [...catalogue, ...(c.webEvidence?.[medicineId]?.entries ?? [])].find((x) => x.id === catalogueId);
    if (!entry) throw new Error("Candidate record unavailable; re-verify first");
    const match = run?.candidates.find((r) => r.entryId === entry.id);
    if (!match || match.disqualified.length || match.score === null)
      throw new Error("Conflicting or insufficient identity information; correct and clarify first");
    if (m.uncertainty.some((u) => !/identity requires verification/i.test(u)))
      throw new Error("Resolve extraction uncertainty before confirming identity");
    if(!m.strength || !m.form || !m.instructions) throw new Error("Recorded strength, form and instructions must be clarified before confirming identity");
    m.verification = "verified";
    m.catalogueId = entry.id;
    m.brand = entry.brand;
    m.ingredients = entry.ingredients;
    m.evidence = `${entry.source}; ${entry.reference}; ${entry.provenance === "web" ? "web evidence retrieved" : "verified"} ${entry.verifiedAt}; pharmacist-confirmed`;
    m.uncertainty = m.uncertainty.filter((u) => !/identity requires verification/i.test(u));
  } else if (decision !== "request-review") {
    m.verification = decision === "unresolved" ? "insufficient" : "unknown";
    m.catalogueId = null;
    m.ingredients = [];
    m.evidence = "";
  }
  run?.reviewerDecisions.push({ decision, candidateId: catalogueId, actor: actor.id, role: actor.role, at: new Date().toISOString(), notes });
  c.approvedVersion = null;
  c.reviews.push({
    actor: actor.id,
    role: actor.role,
    at: new Date().toISOString(),
    decision: `Identity ${decision}: ${m.originalName}`,
    notes,
    dataVersion: version,
    analysisId: null,
  });
  return save(c, actor.id, "Identity reviewed", `${medicineId}; ${decision}; candidate ${catalogueId ?? "none"}`, version);
}
export async function runAnalysis(id: string) {
  const { c, actor } = await loadCase(id);
  await refreshCatalogueIdentities(c);
  const expected = c.version;
  c.version = expected + 1;
  const a = analyze(c, (await sources()).rules);
  a.sourceFingerprint=await sourceFingerprint();
  c.analyses.push(a);
  c.approvedVersion = null;
  return save(
    c,
    actor.id,
    "Safety analysis",
    `Analysis ${a.version}; rules ${a.ruleVersions.join(", ")}`,
    expected,
  );
}
export async function addRenal(id: string, input: unknown, version: number) {
  const { c, actor } = await loadCase(id);
  if (c.version !== version) throw new Error("Refresh this changed case");
  const r = renalSchema.parse(input);
  r.id = crypto.randomUUID();
  c.renal.push(r);
  await refreshCatalogueIdentities(c);
  c.version = version + 1;
  const a = analyze(c, (await sources()).rules);
  a.sourceFingerprint=await sourceFingerprint();
  c.analyses.push(a);
  c.approvedVersion = null;
  return save(
    c,
    actor.id,
    "Renal measurement and re-evaluation",
    `Measurement ${r.id}; analysis ${a.version}; prior results preserved`,
    version,
  );
}
export async function review(
  id: string,
  input: { alertId: string; decision: string; notes: string; final: boolean },
  version: number,
) {
  const { c, actor } = await loadCase(id);
  if (!actor.professional)
    throw new Error("Professional review is restricted to configured clinicians and pharmacists");
  if (c.version !== version) throw new Error("Refresh this changed case");
  const a = c.analyses.at(-1);
  if (!a) throw new Error("Run analysis before professional review");
  if (input.final) {
    await assertCurrentAnalysis(c);
    if (
      !c.medicines.length || !c.prescriptions.length ||
      c.medicines.some((m) => m.verification !== "verified") ||
      c.prescriptions.some((d) => d.status !== "Verified") ||
      a.alerts.some((f) => f.review === "pending") ||
      c.audit.slice(c.audit.map(e=>e.action === "Safety analysis" || e.action === "Renal measurement and re-evaluation").lastIndexOf(true)+1).some(e=>!["Professional review","Report generated"].includes(e.action))
    )
      throw new Error(
        "Final review requires current analysis, verified documents and medicines, and an explicit decision on every finding. Re-run analysis after data changes.",
      );
    c.approvedVersion = version + 1;
  } else {
    c.approvedVersion = null;
    const alert = a.alerts.find((f) => f.id === input.alertId);
    if (!alert) throw new Error("Finding unavailable");
    alert.review = z.enum(["acknowledged", "follow-up", "dismissed"]).parse(input.decision);
    alert.decisionNotes = input.notes;
  }
  c.reviews.push({
    actor: actor.id,
    role: actor.role,
    at: new Date().toISOString(),
    decision: input.final
      ? "Final professional review completed"
      : `${input.decision}: ${input.alertId}`,
    notes: input.notes,
    dataVersion: version,
    analysisId: a.id,
  });
  return save(
    c,
    actor.id,
    "Professional review",
    input.final
      ? "Explicit final review; incomplete checks remain limitations"
      : "Finding decision recorded",
    version,
  );
}
export async function verifyDocument(id: string, documentId: string, version: number) {
  const { c, actor } = await loadCase(id);
  if (!actor.professional) throw new Error("Professional role required");
  if (c.version !== version) throw new Error("Refresh this changed case");
  const d = c.prescriptions.find((d) => d.id === documentId);
  if (!d) throw new Error("Prescription unavailable");
  const entries = c.medicines.filter((m) => m.documentId === documentId);
  if (!entries.length || entries.some((m) => m.verification !== "verified" || m.uncertainty.length))
    throw new Error("Verify every medicine and resolve extraction uncertainty first");
  d.status = "Verified";
  c.approvedVersion = null;
  return save(c, actor.id, "Prescription verified", documentId, version);
}
export async function makeReport(id: string) {
  const { c, actor } = await loadCase(id);
  await assertCurrentAnalysis(c);
  if (!c.analyses.length) throw new Error("Run analysis before generating a report");
  const { reports, ...snapshot } = structuredClone(c);
  const report = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    version: reports.length + 1,
    dataVersion: c.version,
    status: c.approvedVersion === c.version ? ("reviewed" as const) : ("draft" as const),
    snapshot,
  };
  c.reports.push(report);
  if (c.approvedVersion === c.version) c.approvedVersion = c.version + 1;
  return save(
    c,
    actor.id,
    "Report generated",
    `Report ${report.id}; immutable ${report.status} snapshot`,
    c.version,
  );
}
export async function reportPdf(id: string, reportId: string) {
  const { c } = await loadCase(id);
  const r = c.reports.find((r) => r.id === reportId);
  if (!r) throw new Error("Report unavailable");
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = reportLines({ ...r.snapshot, reports: [] }, r.id, r.status, r.at);
  let page = pdf.addPage([595, 842]),
    y = 790;
  const printable = (v: string) =>
    v.replace(/[^\x20-\x7e]/g, (x) => (x === "²" ? "2" : x === "µ" ? "u" : "-"));
  const green = rgb(0.13, 0.4, 0.27), red = rgb(0.75, 0.15, 0.15), ink = rgb(0.12, 0.12, 0.14);
  lines.forEach((line, idx) => {
    const isTitle = idx === 0, isStatus = idx === 1, isHead = /^\d+[A-Z]?\. /.test(line);
    const size = isTitle ? 18 : isHead ? 14 : isStatus ? 12 : 11;
    const f = isTitle || isHead || isStatus ? bold : font;
    const color = isTitle || isHead ? green : isStatus ? red : ink;
    if (isHead) {
      y -= 14;
      if (y < 90) { page = pdf.addPage([595, 842]); y = 790; }
      page.drawLine({ start: { x: 42, y: y + size + 6 }, end: { x: 553, y: y + size + 6 }, thickness: 0.6, color: rgb(0.8, 0.82, 0.8) });
    }
    const words = printable(line).split(/\s+/);
    let row = "";
    const draw = () => {
      if (y < 60) { page = pdf.addPage([595, 842]); y = 790; }
      page.drawText(row, { x: 42, y, size, font: f, color });
      y -= size * 1.5;
    };
    for (const word of words) {
      if (row && f.widthOfTextAtSize(`${row} ${word}`, size) > 511) { draw(); row = ""; }
      row += `${row ? " " : ""}${word}`;
    }
    draw();
    y -= isHead || isTitle ? 6 : 4;
  });
  const pages = pdf.getPages();
  pages.forEach((p, i) =>
    p.drawText(`MediKiosk | ${r.status.toUpperCase()} | ${i + 1} / ${pages.length}`, {
      x: 42,
      y: 28,
      size: 8,
      font,
    }),
  );
  return Array.from(await pdf.save());
}
export async function fileBytes(id: string, documentId: string) {
  const { c, client } = await loadCase(id);
  const d = c.prescriptions.find((d) => d.id === documentId);
  if (!d) throw new Error("Prescription unavailable");
  const result = await client.execute({
    sql: "SELECT bytes FROM medication_safety_files WHERE id=? AND case_id=?",
    args: [documentId, id],
  });
  const bytes: unknown = result.rows[0]?.["bytes"];
  if (!(bytes instanceof ArrayBuffer) && !(bytes instanceof Uint8Array))
    throw new Error("Original file unavailable");
  return { bytes: Array.from(new Uint8Array(bytes)), mime: d.mime, name: d.name };
}
export async function remove(id: string, documentId: string, version: number) {
  const { c, actor, client } = await loadCase(id);
  if (c.version !== version) throw new Error("Refresh this changed case");
  if (c.analyses.length)
    throw new Error(
      "Analyzed source documents are retained for audit; delete the entire case to erase sensitive records",
    );
  c.prescriptions = c.prescriptions.filter((d) => d.id !== documentId);
  c.medicines = c.medicines.filter((m) => m.documentId !== documentId);
  const next = await save(c, actor.id, "Prescription removed", documentId, version);
  await client.execute({
    sql: "DELETE FROM medication_safety_files WHERE id=? AND case_id=?",
    args: [documentId, id],
  });
  return next;
}
export async function deleteCase(id: string) {
  const { c, actor, client } = await loadCase(id);
  if (c.owner !== actor.id) throw new Error("Only the case owner can delete this case");
  await client.batch(
    [
      { sql: "DELETE FROM medication_safety_files WHERE case_id=?", args: [id] },
      { sql: "DELETE FROM medication_safety_access WHERE case_id=?", args: [id] },
      { sql: "DELETE FROM medication_safety_versions WHERE case_id=?", args: [id] },
      {
        sql: "DELETE FROM medication_safety_cases WHERE id=? AND owner_id=?",
        args: [id, actor.id],
      },
    ],
    "write",
  );
  return { deleted: true };
}
export async function history(id: string) {
  const { client } = await loadCase(id);
  const result = await client.execute({
    sql: "SELECT version,actor,at FROM medication_safety_versions WHERE case_id=? ORDER BY version DESC LIMIT 100",
    args: [id],
  });
  return result.rows.map((r) => ({
    version: Number(r["version"]),
    actor: String(r["actor"]),
    at: String(r["at"]),
  }));
}
