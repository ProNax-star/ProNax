import { createFileRoute } from "@tanstack/react-router";
import PronaxStudio from "@/features/pages/PronaxStudio";

export const Route = createFileRoute("/studio/$")({
  head: () => ({
    meta: [
      { title: "Studio — ProNax" },
      { name: "description", content: "Manage videos, analytics and monetization in ProNax Studio." },
      { property: "og:title", content: "Studio — ProNax" },
      { property: "og:description", content: "Manage videos, analytics and monetization in ProNax Studio." },
    ],
  }),
  component: PronaxStudio,
});
