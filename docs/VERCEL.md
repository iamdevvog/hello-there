# Vercel deployment — MediKiosk

## Deploy from Git

1. Push the repository using your Git provider. Import it in Vercel → Add New → Project.
2. Use **Other** as framework, **Node.js 22.x**, install **`npm ci`**, build **`npm run build`**. Leave the Vercel Output Directory override **empty**: Nitro writes the Build Output API to `.vercel/output` automatically. Do not add SPA rewrites or point output to `dist`.
3. Add the environment variables below in Vercel → Settings → Environment Variables for **Production and Preview**, then deploy. Secret values in Lovable are not transferred automatically. Retrieve keys from your provider accounts; never commit them or paste them into chat. Rotate previously exposed credentials before public hosting.
4. For real public use, activate a production Clerk instance, configure your actual domain in Clerk's production setup, and set the matching publishable/secret key pair. Test keys are for demonstrations, not production authentication. Preview deployments must also have Clerk-supported domain configuration.
5. Redeploy after any environment changes. The public Clerk key is embedded at build time; secret keys stay server-side.

## Environment checklist

| Variable | Requirement |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Public key from the **same Clerk instance** as the secret. The only public variable. |
| `CLERK_SECRET_KEY` | Clerk server secret. Legacy `STRIPE_TEST_API_KEY` is still accepted **only when it contains the user-designated Clerk secret**, not a Stripe payment key. Prefer the correct name on Vercel. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Existing Turso URL/token. Reusing them reuses the existing data; use another database for isolated previews. |
| `GEMINI_API_KEY` | Direct Google AI Studio key with API access and sufficient quota/billing. |
| `GEMINI_MODEL` | Optional Google model ID supporting structured generation. Defaults to `gemini-flash-latest`. |
| `GROQ_API_KEY` | Direct Groq access for chat, Whisper transcription, and browser-search-capable medicine evidence. Account/model access and quotas apply. |
| `OCR_SPACE_API_KEY` | Direct OCR.space key; current upload limit is 1 MiB/file. |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | Direct ElevenLabs key and accessible voice. |
| `MEDICATION_EXTERNAL_PROCESSING_APPROVED` | Set `true` only after operator privacy/security approval; patient consent is additionally required. |
| `MEDICATION_PROFESSIONAL_ROLES` | Optional real Clerk user-ID → `clinician`/`pharmacist` JSON map. Required for professional sign-off; cross-owner cases also require an explicitly provisioned case grant. |
| `MEDICATION_CATALOGUE_JSON` / `MEDICATION_RULES_JSON` | Optional licensed catalogue/reviewed rules. Omit when unavailable; unsupported checks remain incomplete. See `MEDICATION_SAFETY.md`. |

No `LOVABLE_API_KEY`, Lovable AI credits, Lovable connector gateway or Lovable Cloud database is required by app service calls. The Lovable Vite config package is a **build-time public npm dependency**, not an AI hosting subscription; it supports the Vercel preset outside Lovable. Images hosted on existing asset CDN URLs still require those URLs to remain available.

`npm run check:env` checks a local `.env` (or current environment) and prints **names/status only**, never values. It is not a provider-access or billing check. `.env.example` contains placeholders, not real credentials.

## Processing limits

Nitro sets Vercel function duration to 120 seconds. Confirm the selected Vercel plan/project allows at least that duration (enable Fluid compute where applicable). OCR has at most two 30-second attempts and one 3-second backoff; Gemini has a 45-second request timeout. Groq search has at most two 35-second attempts with backoff. These finish inside the configured duration in normal operation; database/network overhead and provider outages can still fail requests. Work is awaited, not detached into unreliable post-response background tasks.

Vercel request/response payload limits still apply. The 1 MiB medication upload limit fits the normal function payload budget; large voice recordings or unusually large reports may exceed it. Provider quotas are not bypassed: Gemini/Groq limits show retry/configuration errors, never switch to Lovable AI, and never imply a medicine is counterfeit.

## Verify after deploying

- Home, `/demo`, `/patient-kiosk`, `/sign-in` and direct deep-link refreshes load with no 500 errors.
- Sign in with the configured Clerk instance and verify private pages cannot read another patient's case.
- Complete a synthetic check-in; confirm its saved visit appears through the real UI.
- With recorded privacy approval/consent, upload a synthetic prescription ≤1 MiB, read it, correct OCR, run sourced brand matching, review timeline/findings and download the report.
- Provision a qualified test reviewer and case access to verify sign-off. A configured role alone does not provide access to someone else's case.
- Test microphone transcription, spoken prompts and patient assistant. Check Vercel logs for provider status errors without logging patient content or secrets.

## Known boundaries

Existing admin/operations/assisted console demonstration adapters are not made production integrations by deployment. Licensed clinical datasets and reviewer provisioning remain operator responsibilities. Public walk-up voice endpoints consume your provider quota and should not be exposed as unrestricted high-volume services without deployment abuse controls. This preparation does not claim a clinical certification, full security audit or verified hosted Vercel deployment; authenticated end-to-end validation must run on the configured deployment.