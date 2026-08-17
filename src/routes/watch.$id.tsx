import { createFileRoute } from "@tanstack/react-router";
import Watch from "@/features/pages/Watch";

export const Route = createFileRoute("/watch/$id")({
  head: () => ({
    meta: [
      { title: "Watch — ProNax" },
      { name: "description", content: "Watch videos, comment and support creators on ProNax." },
      { property: "og:title", content: "Watch — ProNax" },
      { property: "og:description", content: "Watch videos, comment and support creators on ProNax." },
    ],
  }),
  component: Watch,
});
