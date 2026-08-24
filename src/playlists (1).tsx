/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Playlists from "@/features/pages/Playlists";

export const Route = createFileRoute("/playlists")({
  head: () => ({
    meta: [
      { title: "Playlists — ProNax" },
      { name: "description", content: "Your ProNax playlists and collections." },
      { property: "og:title", content: "Playlists — ProNax" },
      { property: "og:description", content: "Your ProNax playlists and collections." },
    ],
  }),
  component: Playlists,
});
