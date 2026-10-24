// Print configuration names/status only. Never print values or serialize env.
const required = [
  "VITE_CLERK_PUBLISHABLE_KEY", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN",
  "GEMINI_API_KEY", "GROQ_API_KEY", "OCR_SPACE_API_KEY",
  "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID",
];
let missing = false;
for (const name of required) {
  const present = Boolean(process.env[name]?.trim());
  console.log(`${present ? "OK" : "MISSING"} ${name}`);
  if (!present) missing = true;
}
const clerk = process.env.CLERK_SECRET_KEY?.trim() || process.env.STRIPE_TEST_API_KEY?.trim();
console.log(`${clerk ? "OK" : "MISSING"} CLERK_SECRET_KEY (legacy fallback accepted)`);
if (!clerk) missing = true;
if (process.env.MEDICATION_EXTERNAL_PROCESSING_APPROVED !== "true")
  console.log("NOTICE Medication OCR/search remain paused until operator privacy approval and patient consent.");
if (!process.env.MEDICATION_PROFESSIONAL_ROLES)
  console.log("NOTICE Professional medicine sign-off requires operator-provisioned roles and case access.");
if (missing) process.exitCode = 1;