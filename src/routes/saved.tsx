import { createFileRoute } from "@tanstack/react-router";
import Saved from "@/features/pages/Saved";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved — ProNax" },
      { name: "description", content: "Videos you saved to watch later on ProNax." },
      { property: "og:title", content: "Saved — ProNax" },
      { property: "og:description", content: "Videos you saved to watch later on ProNax." },
    ],
  }),
  component: Saved,
});
