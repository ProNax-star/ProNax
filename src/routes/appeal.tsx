import { createFileRoute } from "@tanstack/react-router";
import Appeal from "@/features/pages/Appeal";

export const Route = createFileRoute("/appeal")({
  head: () => ({
    meta: [
      { title: "Appeal — ProNax" },
      { name: "description", content: "Submit an appeal for a ProNax account or video action." },
      { property: "og:title", content: "Appeal — ProNax" },
      { property: "og:description", content: "Submit an appeal for a ProNax account or video action." },
    ],
  }),
  component: Appeal,
});
