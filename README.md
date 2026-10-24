# MediKiosk

Multilingual healthcare intake and medication-safety application built with TanStack Start, React, Clerk and Turso. Deploys to Vercel using Nitro's generated Build Output API.

**Two separate workflows:** patient check-in prepares a visit for the care team; Medication Safety reconciles prescriptions for professional review. Neither replaces clinical judgement.

## Quick start

Requirements: **Node.js 22.x**, **npm 10+**, and accounts/keys for the services below.

```bash
npm ci
cp .env.example .env
# Fill in the required values in .env using your provider dashboards.
npm run check:env
npm run dev
```

Open the local address printed by Vite. Never commit `.env`, API credentials, patient documents or database exports. The example contains placeholders only.

## Deploy to Vercel

1. Push this repository to your Git provider and import it in **Vercel → Add New → Project**.
2. Set **Framework: Other**, **Node.js: 22.x**, **Install: npm ci**, **Build: npm run build**.
3. **Leave Output Directory override empty.** Nitro generates `.vercel/output`; do not set `dist`, add SPA rewrites, or deploy as a static-only site.
4. Add the environment variables below for **Production and Preview**. Keys saved in Lovable do **not** transfer to Vercel automatically.
5. Confirm the project/plan permits **120-second functions**, as configured in `nitro.config.ts`.
6. Configure the actual deployed domain in Clerk and use a matching publishable/secret key pair. Production hosting needs a production Clerk instance; test keys are suitable only for demonstrations.
7. Deploy and complete the [post-deployment checks](docs/VERCEL.md#verify-after-deploying). Redeploy after environment changes, including changes to the public Clerk key.

This repository is prepared for deployment, **not a claim that a Vercel deployment or authenticated clinical workflow has already been verified**.

## Environment variables

Only `VITE_CLERK_PUBLISHABLE_KEY` is public/build-time. Every other credential must stay server-side. See [.env.example](.env.example) for a copyable template and [docs/VERCEL.md](docs/VERCEL.md) for full setup, quotas and troubleshooting.

| Variable                                  | Requirement                                                                                 | Obtain from                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`              | Required public key; same instance as the secret                                            | Clerk → API Keys                            |
| `CLERK_SECRET_KEY`                        | Required server authentication secret                                                       | Clerk → API Keys                            |
| `TURSO_DATABASE_URL`                      | Required persistent database URL                                                            | Turso → database → Connect                  |
| `TURSO_AUTH_TOKEN`                        | Required database token                                                                     | Turso → database → Create token             |
| `GEMINI_API_KEY`                          | Required clinical extraction, questioning and summaries                                     | Google AI Studio → API keys                 |
| `GROQ_API_KEY`                            | Required assistant, Whisper transcription and medicine browser search                       | Groq Console → API Keys                     |
| `OCR_SPACE_API_KEY`                       | Required report/prescription OCR                                                            | OCR.space API dashboard                     |
| `ELEVENLABS_API_KEY`                      | Required spoken prompts                                                                     | ElevenLabs → API Keys                       |
| `ELEVENLABS_VOICE_ID`                     | Required accessible voice                                                                   | ElevenLabs Voice Library                    |
| `GEMINI_MODEL`                            | Optional structured-generation model; default `gemini-flash-latest`                         | Google model supported by your account      |
| `MEDICATION_EXTERNAL_PROCESSING_APPROVED` | Default `false`; operator privacy approval required before external medication processing   | Operator-controlled setting                 |
| `MEDICATION_PROFESSIONAL_ROLES`           | Optional JSON mapping of real Clerk user IDs to clinician/pharmacist; required for sign-off | Operator provisions qualified reviewers     |
| `MEDICATION_CATALOGUE_JSON`               | Optional licensed catalogue; missing means unavailable, not counterfeit                     | Licensed source; format in medication guide |
| `MEDICATION_RULES_JSON`                   | Optional clinically reviewed rules; missing checks remain incomplete                        | Reviewed rules; format in medication guide  |

The legacy `STRIPE_TEST_API_KEY` name is accepted only as the user-designated **Clerk secret** fallback when `CLERK_SECRET_KEY` is absent. It is not a payment integration. Use the correctly named secret for new deployments.

All AI/OCR/audio calls use **direct Google, Groq, OCR.space and ElevenLabs APIs**. No Lovable AI runtime key or credits are needed. The public Lovable Vite configuration package is a build dependency, not an AI service. Existing asset CDN URLs must remain accessible.

The environment check prints only configuration names/status, not values; it does not verify provider permissions, quota, billing or credentials. Database tables initialize on first use; no separate migration command is required by the current application. Reusing the Turso credentials reuses existing data—use a separate database for isolated previews.

## Product pages and current boundaries

| Page               | Path                    | Purpose / status                                                                                   |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| Home               | `/`                     | Explains the two workflows and links to each                                                       |
| Patient check-in   | `/patient-kiosk`        | Voice-first intake, vitals, papers and saved visit                                                 |
| Patient health     | `/patient`              | Signed-in records and patient assistant                                                            |
| Medication Safety  | `/medication-safety`    | Private prescriptions, extraction, sourced identity review, timeline, supported checks and reports |
| Clinician          | `/clinician`            | Care-team workspace; validate each action against its current adapter                              |
| Assisted intake    | `/assisted-kiosk`       | Staff-facing screens include demonstration adapters                                                |
| Operations / admin | `/operations`, `/admin` | Synthetic console adapters; not production facility administration                                 |
| Presentation demo  | `/demo`                 | Prefilled, animated synthetic showcase; not real patient data or live verification                 |

Do not present demonstration actions as persisted production functionality. The demo PDF control is illustrative; the real Medication Safety report workflow is separate.

## Medication safety safeguards

- External prescription reading/search requires **operator approval and recorded case consent**.
- Private cases require an authenticated owner or an explicitly provisioned case grant.
- Professional roles are server-owned; a role alone does not grant access to another owner's case.
- Web medicine evidence must cite URLs actually returned by search. It remains non-regulatory and requires professional confirmation.
- Matching does not establish physical authenticity. Missing sources never imply counterfeit.
- Only reviewer-confirmed identities feed ingredient-dependent safety checks. Unsupported rules and missing clinical context remain explicitly incomplete.
- Raw source text, corrections, identity runs and report snapshots retain separate audit history.

See [Medication Safety documentation](docs/MEDICATION_SAFETY.md) for configuration, data formats and clinical limitations.

## Commands

| Command                   | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `npm run dev`             | Start local development                                        |
| `npm run build`           | Produce the Vercel server/static bundle                        |
| `npm run build:dev`       | Build in development mode; not for production deployment       |
| `npm run preview`         | Vite local preview; not a substitute for Vercel server testing |
| `npm run check:env`       | Validate required variable presence without revealing values   |
| `npm run test:deployment` | Direct-provider regression tests                               |
| `npx vitest run`          | Run all project tests                                          |
| `npm run typecheck`       | Check TypeScript                                               |
| `npm run lint`            | Check lint rules                                               |
| `npm run check`           | TypeScript and lint checks                                     |
| `npm run format:check`    | Check formatting                                               |
| `npm run format`          | Apply formatting                                               |

`package-lock.json` is the Vercel/npm installation lockfile. Keep it synchronized with `package.json`; do not commit generated deployment output or `node_modules`.

## Project structure

```text
src/routes/                    Thin TanStack routes, metadata and HTTP endpoints
src/features/                  Product-owned UI and workflow modules
src/features/medication-safety/ Private medication workflow and matching engine
src/lib/clinical/              Direct clinical providers and document handling
src/components/ui/             Shared accessible controls
src/start.ts                   Clerk request middleware
src/server.ts                  Server entry
src/styles.css                 Semantic design tokens
scripts/check-env.mjs          Value-safe environment presence check
vite.config.ts                 TanStack/Vite setup and Nitro Vercel preset
nitro.config.ts                Vercel request duration
vercel.json                    Install/build settings
```

Routes must keep unique metadata and use TanStack Router. Never manually edit `src/routeTree.gen.ts`. Secret-backed work belongs behind authenticated server functions or explicitly authorized HTTP handlers, never in browser components.

## Release checklist

- Run tests and repository checks; inspect production build errors.
- Verify deep-link refresh, sign-in and a synthetic saved check-in on the actual host.
- Verify consented upload → extraction → correction → sourced identity review → timeline → report while signed in.
- Provision a qualified reviewer and explicit case access for sign-off checks.
- Check voice input/output and assistant through the deployed UI.
- Rotate exposed credentials, configure deployment abuse controls for public quota-consuming endpoints, and review security/privacy before using real patient data.
- Confirm plan limits: OCR currently accepts files up to **1 MiB**; Vercel payload limits and provider quotas still apply.

Current outstanding validation: real Vercel deployment, signed-in upload-to-report flow, licensed catalogue/rules and reviewer activation. A recent direct Gemini connectivity check timed out; provider availability is not guaranteed by passing unit tests.

## Documentation

- [Vercel setup and post-deployment checks](docs/VERCEL.md)
- [Architecture and boundaries](docs/ARCHITECTURE.md)
- [Medication Safety configuration](docs/MEDICATION_SAFETY.md)
- [Route conventions](src/routes/README.md)
- [Remaining tasks](roadmap.md)

## License

No license has been assigned. All rights reserved unless the owner adds a license.
