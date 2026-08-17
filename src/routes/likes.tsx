import { createFileRoute } from "@tanstack/react-router";
import Likes from "@/features/pages/Likes";

export const Route = createFileRoute("/likes")({
  head: () => ({
    meta: [
      { title: "Liked videos — ProNax" },
      { name: "description", content: "Videos you've liked on ProNax." },
      { property: "og:title", content: "Liked videos — ProNax" },
      { property: "og:description", content: "Videos you've liked on ProNax." },
    ],
  }),
  component: Likes,
});
