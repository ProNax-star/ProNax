import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/features/pages/Profile";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Profile — ProNax" },
      { name: "description", content: "Your ProNax channel profile and uploads." },
      { property: "og:title", content: "Profile — ProNax" },
      { property: "og:description", content: "Your ProNax channel profile and uploads." },
    ],
  }),
  component: Profile,
});
