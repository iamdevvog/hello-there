# MediKiosk Medication Safety

Dedicated page: `/medication-safety`. The feature uses the existing TanStack Start/React UI, Clerk session and Turso database; it does not introduce another application, authentication system or database.

## Working boundaries

- Every server read/write/file/report operation resolves Clerk identity. Cases are owner-isolated; configured professionals also need a provisioned case access grant.
- The existing patient row is linked by authenticated account only, never an arbitrary browser-supplied patient ID.
- Private files are stored as Turso BLOBs, capped at the existing OCR plan limit of 1 MiB. Actual PDF/PNG/JPEG signatures are checked and content hashes deduplicate within a case.
- Case writes use optimistic version checks and database transactions. Previous case versions, corrections, raw OCR, measurements, analyses and report snapshots are preserved. Files and sensitive history are erased on owner-confirmed case deletion. Analyzed sources cannot be removed independently.
- Extraction is request-driven and persisted at each stage. An interrupted Extracting job can be explicitly retried after three minutes; there is no durable background worker claim.
- Only configured licensed medicine entries can provide ingredients. Candidate discovery uses exact brand, aliases, ingredients and conservative name similarity with strength/form conflict detection; confirmation is professional-only.
- Ingredient overlaps are structural reconciliation findings with no invented clinical severity. Reviewed rules alone assign clinical severity. Dose computation from free text is intentionally unavailable.
- Final review requires verified source documents and medicine identities and explicit decisions on findings. Unevaluated checks remain report limitations. Data changes reset approval; reports preserve their original state.
- PDFs contain nine sections, provenance, review state and page numbers. Standard PDF font export transliterates non-Latin characters; the full Unicode browser/print report is authoritative when exact multilingual typography matters.

## Configuration

Existing `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, Clerk configuration, `OCR_SPACE_API_KEY`, and `GEMINI_API_KEY` are reused. Gemini extraction uses the existing preferred `gemini-3.6-flash`, without fallback-model substitutions in the new module.

New optional server-only integration inputs:

- `MEDICATION_EXTERNAL_PROCESSING_APPROVED=true`: operator confirms privacy/security/consent/contractual review for OCR.space and Gemini. Disabled by default; UI patient consent alone cannot enable it. Use synthetic/de-identified material for development. No external provider call occurs without both gates.
- `MEDICATION_PROFESSIONAL_ROLES`: JSON mapping Clerk user IDs to `clinician` or `pharmacist`, provisioned by an operator, not a browser role selector. No users are assigned automatically. Ordinary admin status does not imply clinical qualifications.
- `MEDICATION_CATALOGUE_JSON`: versioned licensed catalogue records validated by `catalogueSchema` in `model.ts`: id, brand, aliases, ingredient names/strengths/units, form, route, source, reference URL, verifiedAt, active status, optional source-backed uses. No fabricated catalogue is seeded. For larger licensed datasets replace `sources()` with a paginated authenticated provider or Turso-backed adapter while preserving this contract.
- `MEDICATION_RULES_JSON`: reviewed rules validated by `ruleSchema` in `engine.ts`. Every rule needs ID, version, reviewedBy, reviewedAt, ingredient identities, category, severity, title, rationale, source and reference. Supported categories: interaction (two or more exact ingredients), renal (eGFR threshold and maxAgeDays), age (threshold), exact documented allergy or condition (condition text). Dose rules remain incomplete until validated structured dosing inputs are implemented. These adapters do not constitute a licensed interaction database by themselves.

Grant professional access using a trusted operator process to insert `(case_id,user_id,granted_by)` into `medication_safety_access`; the ordinary app does not let patients assign clinical roles. A provisioned clinician-owned case also works. Role configuration and patient access must both be present.

## API equivalents

`safety.functions.ts` exposes typed server functions for cases/context; upload/process/source access; correction/resolution/confirmation; timeline derives deterministically from source records; analyses/findings are versioned within cases; professional findings/final review; renal re-evaluation; immutable report generation/PDF; history; removal/deletion. All inputs are schema-validated and server-authorized. Repeated extraction of a completed document returns its stored case; duplicate upload hashes are rejected. Lists are bounded to the latest 100 cases/history entries; larger deployments need cursor pagination and storage quotas.

## Deployment and outstanding prerequisites

Preserve the existing Vercel-ready deployment. Automatic build/type validation is managed by Lovable. Run `bunx vitest run src/features/medication-safety/safety.test.ts` for synthetic acceptance tests. This suite is not clinical validation; configured rule datasets still require clinical governance and licensing review.

No authoritative Indian catalogue, interaction database or clinical rules were supplied. Their UI states remain unavailable. Operator privacy approval and professional grants were not fabricated. Clerk signed-in end-to-end testing requires an actual configured session; public rendering and server-denial tests do not prove authenticated workflow completion. Persistent job queues, enterprise retention schedules, malware scanning and multi-tenant clinical assignment administration are not represented as completed infrastructure.
