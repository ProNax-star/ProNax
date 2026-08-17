import { createFileRoute } from "@tanstack/react-router";
import Explore from "@/features/pages/Explore";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — ProNax" },
      { name: "description", content: "Browse categories, trending creators and fresh uploads on ProNax." },
      { property: "og:title", content: "Explore — ProNax" },
      { property: "og:description", content: "Browse categories, trending creators and fresh uploads on ProNax." },
    ],
  }),
  component: Explore,
});
