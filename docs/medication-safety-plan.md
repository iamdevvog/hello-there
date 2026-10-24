# MediKiosk Medication Safety implementation plan

1. Add `/medication-safety` as a separate MediKiosk workspace and navigation entry, using existing React/TanStack routes, Clerk, shared controls and theme.
2. Persist owner-isolated cases, private prescription bytes, append-only corrections, renal measurements, analyses and report snapshots in the existing Turso database. Do not add another database or login system.
3. Reuse OCR.space with a schema-validated Gemini prescription parser. Require consent plus operator privacy approval before external processing. Keep raw text and field evidence; preserve unresolved ambiguity.
4. Add licensed catalogue and reviewed-rule adapters with explicit unavailable states. Build timeline, ingredient reconciliation, ranked findings, medicine details and renal change history without invented clinical knowledge.
5. Enforce professional-role checks on the server; preserve draft status until explicit authorized review. Generate detailed browser/print reports and downloadable PDFs.
6. Test safety, uncertainty, authorization, upload validation, re-evaluation and report snapshots; verify public integration and document unavailable dependencies honestly.
