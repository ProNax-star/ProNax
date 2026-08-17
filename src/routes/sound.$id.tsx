import { createFileRoute } from "@tanstack/react-router";
import SoundPage from "@/features/pages/SoundPage";

export const Route = createFileRoute("/sound/$id")({
  head: () => ({
    meta: [
      { title: "Sound — ProNax" },
      { name: "description", content: "Explore every short video created with this sound on ProNax." },
      { property: "og:title", content: "Sound — ProNax" },
      { property: "og:description", content: "Explore every short video created with this sound on ProNax." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SoundPage,
});
