import { createFileRoute } from "@tanstack/react-router";
import GoLive from "@/features/pages/GoLive";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Go live — ProNax" },
      { name: "description", content: "Start a live stream to your ProNax audience." },
      { property: "og:title", content: "Go live — ProNax" },
      { property: "og:description", content: "Start a live stream to your ProNax audience." },
    ],
  }),
  component: GoLive,
});
