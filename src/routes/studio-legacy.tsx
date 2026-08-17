import { createFileRoute } from "@tanstack/react-router";
import Studio from "@/features/pages/Studio";

export const Route = createFileRoute("/studio-legacy")({
  head: () => ({
    meta: [
      { title: "Studio (legacy) — ProNax" },
      { name: "description", content: "The legacy ProNax creator studio dashboard." },
      { property: "og:title", content: "Studio (legacy) — ProNax" },
      { property: "og:description", content: "The legacy ProNax creator studio dashboard." },
    ],
  }),
  component: Studio,
});
