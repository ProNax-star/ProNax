import { createFileRoute } from "@tanstack/react-router";
import Shorts from "@/features/pages/Shorts";

export const Route = createFileRoute("/shorts/$id")({
  head: () => ({
    meta: [
      { title: "Shorts — ProNax" },
      { name: "description", content: "Swipe through short vertical videos on ProNax." },
      { property: "og:title", content: "Shorts — ProNax" },
      { property: "og:description", content: "Swipe through short vertical videos on ProNax." },
    ],
  }),
  component: Shorts,
});
