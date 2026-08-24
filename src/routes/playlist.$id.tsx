/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import PlaylistDetail from "@/features/pages/PlaylistDetail";

export const Route = createFileRoute("/playlist/$id")({
  head: () => ({
    meta: [
      { title: "Playlist — ProNax" },
      { name: "description", content: "A ProNax playlist of videos." },
      { property: "og:title", content: "Playlist — ProNax" },
      { property: "og:description", content: "A ProNax playlist of videos." },
    ],
  }),
  component: PlaylistDetail,
});
