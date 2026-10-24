import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/clinician/patients")({
  head: () => ({
    meta: [
      { title: "Patient workspace | MediKiosk" },
      { name: "description", content: "MediKiosk care-team workspace for patient visits and prepared clinical cases." },
      { property: "og:title", content: "Patient workspace | MediKiosk" },
      { property: "og:description", content: "Review patient visits and prepared clinical cases with MediKiosk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});
