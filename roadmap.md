# Service credentials

# Medication Safety
- [x] Add separate MediKiosk page and existing navigation entry
- [x] Implement owner-isolated cases, private prescriptions, corrections and audit history in Turso
- [x] Implement consent-gated OCR/extraction and traceable catalogue adapters
- [x] Implement timeline, deterministic checks, renal re-evaluation and immutable reports
- [x] Implement server-authorized professional review
- [x] Add acceptance tests, integration documentation and public desktop/mobile browser checks
- [ ] Verify authenticated upload-to-report workflow — blocked by unavailable Clerk test session and operator privacy approval
- [ ] Activate licensed medicine catalogue and clinically reviewed rules — requires supplied licensed datasets and qualified reviewer provisioning

- [x] Store Gemini and Turso credentials and the ElevenLabs voice selection securely
- [x] Link ElevenLabs and securely configure OCR.space
- [x] Use the user-designated existing secret for Clerk sign-in
- [x] Verify service access, synthetic OCR, spoken prompt output, and home/sign-in page rendering
- [x] Verify Groq transcription with synthetic speech and assistant replies through the app
- [x] Walk the whole check-in in a live browser from welcome to check-in code, with the case saved as ready-for-review and an assisted draft attached

# Assisted Kiosk roadmap
- [x] Add typed synthetic staff queue data and frontend API boundary
- [x] Build assisted-care provider and local queue interactions
- [x] Build staff shell, navigation, profile, accessibility, and help
- [x] Build searchable/filterable queue, patient preview, intake confirmation, and status sections
- [x] Add main and future workflow routes with metadata
- [x] Verify interactions, responsive layouts, and existing product routes

# Operations Console roadmap

- [x] Add typed synthetic operations data and API boundary
- [x] Build operations provider, shell, header, sidebar, and responsive navigation
- [x] Build overview health, attention, processing, services, pipeline, and audit views
- [x] Build DLQ, manual review, outbox, search health, and replay screens
- [x] Add filters, inspection, copy, retry, review, replay, loading, empty, and error states
- [x] Add route metadata and verify all product surfaces

# Admin Console roadmap

- [x] Add typed synthetic admin data and frontend API boundary
- [x] Build admin provider, shell, header, sidebar, and responsive navigation
- [x] Build overview, users, roles, facilities, audit, and configuration screens
- [x] Add detail panels, confirmations, demo updates, loading, empty, and error states
- [x] Add route metadata and verify all product surfaces

# Project organization

- [x] Consolidate product code into feature-owned folders
- [x] Preserve route files and public URLs as a thin routing layer
- [x] Add professional setup, architecture, route, and contribution documentation
- [x] Add type-check and repository quality scripts
- [x] Verify all product surfaces at desktop and mobile sizes

# Patient kiosk check-in journey

- [x] Real consent, details, how-it-works, own-words, confirm, questions, measurements and papers screens
- [x] Speaking and listening on every spoken question
- [x] Whole check-in saved to the database with a check-in code
- [x] Bilingual wording, touch keypads and back/continue on every step
- [x] Generate complaint-specific clinical follow-up questions and save the patient's answers
