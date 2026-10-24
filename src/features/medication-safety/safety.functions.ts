import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dateValue, medicineSchema, profileSchema, renalSchema } from "./model";
const caseInput = z.object({ id: z.string().uuid() });
const versionInput = caseInput.extend({ version: z.number().int().positive() });
const documentInput = caseInput.extend({ documentId: z.string().uuid() });
export const getSafetyServices = createServerFn({ method: "GET" }).handler(async () =>
  (await import("./safety.server")).services(),
);
export const listSafetyCases = createServerFn({ method: "GET" }).handler(async () =>
  (await import("./safety.server")).listCases(),
);
export const getSafetyCase = createServerFn({ method: "GET" })
  .inputValidator((v) => caseInput.parse(v))
  .handler(async ({ data }) => (await (await import("./safety.server")).loadCase(data.id)).c);
export const createSafetyCase = createServerFn({ method: "POST" })
  .inputValidator((v) => profileSchema.parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).createCase(data));
export const saveSafetyProfile = createServerFn({ method: "POST" })
  .inputValidator((v) => versionInput.extend({ profile: profileSchema }).parse(v))
  .handler(async ({ data }) =>
    (await import("./safety.server")).updateProfile(data.id, data.profile, data.version),
  );
export const uploadPrescription = createServerFn({ method: "POST" })
  .inputValidator((v) =>
    versionInput
      .extend({
        file: z.object({
          name: z.string().min(1).max(200),
          mime: z.enum(["application/pdf", "image/png", "image/jpeg"]),
          base64: z.string().max(1400000),
          label: z.string().min(1).max(200),
          prescriber: z.string().max(200),
          date: dateValue,
          clinic: z.string().max(200),
        }),
      })
      .parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./safety.server")).upload(data.id, data.file, data.version),
  );
export const processPrescription = createServerFn({ method: "POST" })
  .inputValidator((v) => documentInput.parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).processPrescriptionFile(data.id, data.documentId));
export const correctMedicine = createServerFn({ method: "POST" })
  .inputValidator((v) =>
    versionInput
      .extend({ medicine: medicineSchema, notes: z.string().trim().min(1).max(1000) })
      .parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./safety.server")).correct(data.id, data.medicine, data.version, data.notes),
  );
export const resolveMedicine = createServerFn({ method: "GET" })
  .inputValidator((v) => caseInput.extend({ medicineId: z.string() }).parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).resolve(data.id, data.medicineId));
export const confirmMedicine = createServerFn({ method: "POST" })
  .inputValidator((v) =>
    versionInput
      .extend({
        medicineId: z.string(),
        catalogueId: z.string(),
        decision: z.enum(["confirm", "reject"]),
        notes: z.string().min(1).max(1000),
      })
      .parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./safety.server")).confirm(
      data.id,
      data.medicineId,
      data.catalogueId,
      data.decision,
      data.notes,
      data.version,
    ),
  );
export const runSafetyAnalysis = createServerFn({ method: "POST" })
  .inputValidator((v) => caseInput.parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).runAnalysis(data.id));
export const recordRenalMeasurement = createServerFn({ method: "POST" })
  .inputValidator((v) => versionInput.extend({ measurement: renalSchema }).parse(v))
  .handler(async ({ data }) =>
    (await import("./safety.server")).addRenal(data.id, data.measurement, data.version),
  );
export const recordProfessionalReview = createServerFn({ method: "POST" })
  .inputValidator((v) =>
    versionInput
      .extend({
        review: z.object({
          alertId: z.string(),
          decision: z.enum(["acknowledged", "follow-up", "dismissed"]),
          notes: z.string().trim().min(1).max(2000),
          final: z.boolean(),
        }),
      })
      .parse(v),
  )
  .handler(async ({ data }) =>
    (await import("./safety.server")).review(data.id, data.review, data.version),
  );
export const verifyPrescription = createServerFn({ method: "POST" })
  .inputValidator((v) => documentInput.extend({ version: z.number().int().positive() }).parse(v))
  .handler(async ({ data }) =>
    (await import("./safety.server")).verifyDocument(data.id, data.documentId, data.version),
  );
export const generateSafetyReport = createServerFn({ method: "POST" })
  .inputValidator((v) => caseInput.parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).makeReport(data.id));
export const downloadSafetyReport = createServerFn({ method: "GET" })
  .inputValidator((v) => caseInput.extend({ reportId: z.string().uuid() }).parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).reportPdf(data.id, data.reportId));
export const downloadPrescription = createServerFn({ method: "GET" })
  .inputValidator((v) => documentInput.parse(v))
  .handler(async ({ data }) =>
    (await import("./safety.server")).fileBytes(data.id, data.documentId),
  );
export const removePrescription = createServerFn({ method: "POST" })
  .inputValidator((v) => documentInput.extend({ version: z.number().int().positive() }).parse(v))
  .handler(async ({ data }) =>
    (await import("./safety.server")).remove(data.id, data.documentId, data.version),
  );
export const deleteSafetyCase = createServerFn({ method: "POST" })
  .inputValidator((v) => caseInput.parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).deleteCase(data.id));
export const getSafetyHistory = createServerFn({ method: "GET" })
  .inputValidator((v) => caseInput.parse(v))
  .handler(async ({ data }) => (await import("./safety.server")).history(data.id));
