import { createFileRoute } from "@tanstack/react-router";
import Index from "@/features/pages/Index";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending — ProNax" },
      { name: "description", content: "See what's trending right now across ProNax." },
      { property: "og:title", content: "Trending — ProNax" },
      { property: "og:description", content: "See what's trending right now across ProNax." },
    ],
  }),
  component: Index,
});
