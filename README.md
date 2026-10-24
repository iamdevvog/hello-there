# MediKiosk

MediKiosk is a multilingual healthcare intake suite for patients, care teams, facility staff, platform operators, and administrators. It runs a real backend: patient check-ins, adaptive AI questioning, document OCR with staff verification, and clinician review are all persisted.

## Product surfaces

| Surface             | Entry route       | Purpose                                                       |
| ------------------- | ----------------- | ------------------------------------------------------------- |
| Public website      | `/`               | Patient-facing introduction and kiosk entry point             |
| Patient Kiosk       | `/patient-kiosk`  | Guided, bilingual patient intake experience                   |
| Patient Health      | `/patient`        | Personal records, documents, consultations, and consent views |
| Assisted Kiosk      | `/assisted-kiosk` | Staff queue and assisted-intake workspace                     |
| Clinician Workspace | `/clinician`      | Clinical worklist and case-review experience                  |
| Operations Console  | `/operations`     | Operational health, queues, audit, and replay tools           |
| Admin Console       | `/admin`          | Users, roles, facilities, audit, and configuration            |

Patient, encounter, intake, document, and verification data is stored in Turso (libSQL). Sign-in is handled by Clerk. Clinical language work uses Google Gemini, document scanning uses OCR.space, spoken prompts use ElevenLabs, and the patient assistant chat plus speech-to-text use Groq (Whisper + GPT-OSS).

## Technology

- TanStack Start and TanStack Router
- React 19 and TypeScript
- Tailwind CSS 4
- Radix UI primitives and shadcn/ui components
- Vite and Nitro
- npm package management
- Turso (libSQL) database
- Clerk authentication
- Google Gemini, OCR.space, ElevenLabs, and Groq integrations
- Vercel deployment preset (see the deployment checklist below)

## Getting started

### Requirements

- Node.js 22 or later
- npm 10 or later

### Installation

```bash
git clone <repository-url>
cd <repository-name>
npm install
npm run dev
```

Open the local address printed by Vite.

### Environment variables

Copy `.env.example` to `.env` and fill in required values before running the app. Only `VITE_CLERK_PUBLISHABLE_KEY` is public; all other credentials stay server-side. Provider calls use your direct APIs without Lovable AI.

| Variable              | Required | Used for                                              | Where to get it                                                  |
| --------------------- | -------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `TURSO_DATABASE_URL`  | Yes      | Database connection (patients, encounters, docs)      | [turso.tech](https://turso.tech) → database → Connect            |
| `TURSO_AUTH_TOKEN`    | Yes      | Database auth token                                   | Turso → database → Create token                                  |
| `CLERK_SECRET_KEY`    | Yes      | Server-side session verification for staff/patients   | [dashboard.clerk.com](https://dashboard.clerk.com) → API Keys    |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Public Clerk instance key, set at build time | Clerk → API Keys (same instance as secret) |
| `GEMINI_API_KEY`      | Yes      | Adaptive intake questions, fact extraction, summaries | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `OCR_SPACE_API_KEY`   | Yes      | Prescription and report OCR                           | [ocr.space/ocrapi](https://ocr.space/ocrapi)                     |
| `ELEVENLABS_API_KEY`  | Yes      | Spoken kiosk prompts                                  | [elevenlabs.io](https://elevenlabs.io) → API Keys                |
| `ELEVENLABS_VOICE_ID` | Yes      | Which ElevenLabs voice speaks                         | ElevenLabs Voice Library                                         |
| `GROQ_API_KEY`        | Yes      | Patient assistant chat and voice transcription        | [console.groq.com/keys](https://console.groq.com/keys)           |

Set Clerk's public key with `VITE_CLERK_PUBLISHABLE_KEY`, and its matching server secret with `CLERK_SECRET_KEY`. The user-designated legacy Clerk-secret fallback remains supported. See [Vercel setup](docs/VERCEL.md) for optional medication/privacy/reviewer settings and quota limitations.

Database tables are created automatically on the first request, so there is no migration command to run.

Missing keys fail gracefully per feature: the app still loads, but the dependent step reports a configuration error (for example OCR returns a failed document instead of extracted facts).

## Commands

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `bun run dev`          | Start the development server            |
| `bun run build`        | Create a production build               |
| `bun run build:dev`    | Create a development-mode build         |
| `bun run preview`      | Preview a completed build               |
| `bun run typecheck`    | Check TypeScript without emitting files |
| `bun run lint`         | Run ESLint across the repository        |
| `bun run format`       | Format supported files with Prettier    |
| `bun run format:check` | Check formatting without changing files |
| `bun run check`        | Run TypeScript and lint checks          |
| `npm run check:env`    | Check required environment names without printing values |
| `npm run test:deployment` | Run direct-provider regression tests |

## Project structure

```text
src/
├── assets/                 # Bundled images and managed asset references
├── components/
│   └── ui/                 # Shared design-system primitives
├── features/               # Product-owned modules
│   ├── admin/
│   ├── assisted-kiosk/
│   ├── clinician/
│   ├── landing/
│   ├── operations/
│   ├── patient/
│   └── patient-kiosk/
├── hooks/                  # Generic reusable React hooks
├── lib/                    # Cross-product utilities and infrastructure
├── routes/                 # Thin TanStack route definitions
├── router.tsx              # Router construction
├── server.ts               # Server entry and error boundary wrapper
├── start.ts                # Client/server startup configuration
└── styles.css              # Global tokens, utilities, and base styles
```

Each folder under `src/features/` owns its pages, components, state provider, types, frontend API adapter, mock data, and translations where applicable. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for boundaries and contribution rules.

## Route map

### Patient Kiosk

`/patient-kiosk`, `/patient-kiosk/consent`, `/patient-kiosk/introduction`, `/patient-kiosk/identification`, `/patient-kiosk/questions`, `/patient-kiosk/case-taking`, `/patient-kiosk/vitals`, `/patient-kiosk/documents`, `/patient-kiosk/review`, `/patient-kiosk/confirm`, `/patient-kiosk/processing`, `/patient-kiosk/complete`

### Patient Health

`/patient`, `/patient/timeline`, `/patient/reports`, `/patient/documents`, `/patient/intakes`, `/patient/consents`, `/patient/notifications`, `/patient/profile`

The legacy `/patient/intake` compatibility experience remains intentionally separate from the Patient Health shell.

### Assisted Kiosk

`/assisted-kiosk`, `/assisted-kiosk/queue`, `/assisted-kiosk/start`, `/assisted-kiosk/case-taking`, `/assisted-kiosk/vitals`, `/assisted-kiosk/documents`, `/assisted-kiosk/handoff`

### Clinician Workspace

`/clinician`, `/clinician/worklist`, `/clinician/patients`, `/clinician/patients/:id`, `/clinician/patients/:id/sign`, `/clinician/documents`, `/clinician/alerts`, `/clinician/timeline`, `/clinician/settings`

### Operations Console

`/operations`, `/operations/dlq`, `/operations/manual-review`, `/operations/outbox`, `/operations/search`, `/operations/replay`

### Admin Console

`/admin`, `/admin/users`, `/admin/roles`, `/admin/facilities`, `/admin/audit`, `/admin/configuration`

## Development conventions

1. Keep route files small: define metadata, compose providers/layouts, and render a feature page.
2. Add product-specific code to its folder in `src/features/`; do not place it in shared folders.
3. Put only product-neutral controls in `src/components/ui/`, hooks in `src/hooks/`, and utilities in `src/lib/`.
4. Import source code through the `@/` alias.
5. Never edit `src/routeTree.gen.ts`; TanStack Router generates it from `src/routes/`.
6. Preserve typed mock API boundaries so future services can replace mocks without redesigning screens.
7. Keep all patient and operational examples synthetic and free of personally identifiable information.
8. Maintain keyboard navigation, visible focus, reduced-motion support, readable contrast, and responsive layouts.

## Quality checks

Before opening a change for review:

```bash
npm run check
npm run format:check
npm run build
```

For visual changes, verify the affected surface at desktop and mobile sizes and check the browser console for errors.

## Deployment

### Deploy to Vercel

The repository is Vercel-ready: `vercel.json` and `package-lock.json` configure npm, and `vite.config.ts` sets `nitro: { preset: "vercel" }` so the build emits a Vercel serverless bundle.

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In Vercel, **Add New → Project** and import the repository.
3. Leave the framework preset as **Other**; Vercel reads `vercel.json`:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory override: **leave empty** (Nitro generates `.vercel/output` via the Build Output API)
   - Node.js: **22.x**; allow a **120-second** function duration
4. Under **Settings → Environment Variables**, add the required variables in `.env.example` for Production and Preview; optional medication settings are explained in [the deployment guide](docs/VERCEL.md). Secrets saved in Lovable are not copied to Vercel automatically. `.env` itself is never committed.
5. Deploy. Database tables are created on the first request.
6. In the Clerk dashboard, add the deployed domain to the allowed origins / production instance so sign-in works from the live URL.

Redeploy after changing any environment variable — Vercel only picks up new values on a fresh build.

#### Post-deploy checklist

- `/` loads and the kiosk entry works.
- `/patient-kiosk` completes a check-in end to end (questions, review, AI summary).
- `/patient/timeline` shows the signed-in patient's real visits.
- `/assisted-kiosk/documents` and `/clinician/documents` load for signed-in staff and allow OCR verification.
- The patient assistant replies and voice input/output work (needs `GROQ_API_KEY` and the ElevenLabs keys).

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — ownership, dependencies, data flow, and extension guidance
- [`docs/VERCEL.md`](docs/VERCEL.md) — independent hosting, exact keys, limits and post-deploy checks
- [`src/routes/README.md`](src/routes/README.md) — route filename conventions
- [`roadmap.md`](roadmap.md) — implementation checklist

## License

No license has been assigned. All rights are reserved unless the project owner adds a license.
