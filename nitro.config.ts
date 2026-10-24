import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  // Allow OCR + extraction within a single request on Vercel. No long-running
  // work is detached from the response; Vercel can stop detached promises.
  vercel: { functions: { maxDuration: 120 } },
});
