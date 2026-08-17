import { createFileRoute } from "@tanstack/react-router";
import Upload from "@/features/pages/Upload";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload — ProNax" },
      { name: "description", content: "Upload a new video to your ProNax channel." },
      { property: "og:title", content: "Upload — ProNax" },
      { property: "og:description", content: "Upload a new video to your ProNax channel." },
    ],
  }),
  component: Upload,
});
