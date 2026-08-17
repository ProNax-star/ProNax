import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/features/pages/Settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ProNax" },
      { name: "description", content: "Manage your ProNax account preferences and playback settings." },
      { property: "og:title", content: "Settings — ProNax" },
      { property: "og:description", content: "Manage your ProNax account preferences and playback settings." },
    ],
  }),
  component: Settings,
});
