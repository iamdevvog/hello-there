<!-- MediKiosk project guidelines -->

# MediKiosk

Multilingual healthcare intake suite for patients, care teams, facility staff, platform operators, and administrators.

## Key Guidelines

- **Clinical AI**: Clinical reasoning, extraction, and summaries use Google Gemini.
- **Patient Assistant & Voice**: Chat assistance and voice transcription (Whisper) are powered by Groq.
- **Audio Output**: Spoken kiosk prompts use ElevenLabs.
- **Database**: All persistence is managed via Turso (libSQL).
- **Deployment**: Use Nitro's Vercel preset and generated Build Output API, with Node 22 and synchronized npm lockfile; configure request duration in nitro.config.ts so document processing fits serverless execution.
- **Provider portability**: Share direct structured Gemini requests through gemini-api.server.ts and keep prescription schema/evidence validation in prescription-extraction.server.ts; this avoids hosting-specific AI credentials and bounds provider waits.
- **Clerk credentials**: Resolve the secret inside request middleware, preferring `CLERK_SECRET_KEY` with `STRIPE_TEST_API_KEY` as the user-designated legacy fallback; never expose either to the browser.
- **Medication Safety**: Keep the feature in `src/features/medication-safety` with a thin `/medication-safety` route and authenticated server functions; isolate private Turso cases and version history rather than reuse insecure encounter endpoints.
- **Clinical authorization**: Medication Safety resolves clinician/pharmacist roles from server-owned configuration and requires owner access or an explicitly provisioned case grant; never accept roles or verification facts from browser input.
- **Clinical knowledge**: Load licensed catalogue entries and reviewed rules through server adapters; live web medicine evidence (Groq browser search) is allowed only when every product cites a URL the search tool actually returned, is labelled non-regulatory, and needs pharmacist confirmation before feeding safety checks.
- **External processing**: Prescription OCR/Gemini processing requires recorded consent and operator privacy approval; raw sources, corrections, renal measurements, analyses and report snapshots stay separately auditable.
- Medicine identity verification lives in `verification.ts` as a pure versioned engine; runs are append-only on the case and only reviewer-confirmed identities feed ingredient-based safety checks — keeps match scores auditable and separate from authenticity.
- Kiosk floating menus and help overlays render through body portals with viewport-constrained content; this prevents header backdrop filters and animated media from covering or clipping controls.
