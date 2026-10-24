import { createFileRoute } from "@tanstack/react-router";
import { MedicationSafetyPage } from "@/features/medication-safety/MedicationSafetyPage";
export const Route = createFileRoute("/medication-safety")({
  head: () => ({
    meta: [
      { title: "Medication Safety Intelligence | MediKiosk" },
      {
        name: "description",
        content:
          "Private prescription reconciliation, source-traceable medicine verification, medication timelines and professional safety review in MediKiosk.",
      },
      { property: "og:title", content: "Medication Safety | MediKiosk" },
      {
        property: "og:description",
        content:
          "Reconcile prescriptions with explicit clinical uncertainty and professional review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MedicationSafetyPage,
});
