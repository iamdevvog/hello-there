import { createFileRoute } from "@tanstack/react-router";
import { DemoTour } from "@/features/demo/DemoTour";

export const Route = createFileRoute("/demo")({
  validateSearch: (s: Record<string, unknown>) => ({
    step: Math.max(0, Number(s["step"] ?? 0) || 0),
  }),
  head: () => ({
    meta: [
      { title: "Product Demo - MediKiosk" },
      {
        name: "description",
        content: "A guided, prefilled walkthrough of every MediKiosk feature, from check-in to clinician report.",
      },
      { property: "og:title", content: "Product Demo - MediKiosk" },
      {
        property: "og:description",
        content: "Click through the full MediKiosk journey with sample data: kiosk, clinician, medication safety and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoTour,
});
