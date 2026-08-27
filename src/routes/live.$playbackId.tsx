/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import LiveWatch from "@/features/pages/LiveWatch";

export const Route = createFileRoute("/live/$playbackId")({
  head: () => ({
    meta: [
      { title: "Live Stream — ProNax" },
      { name: "description", content: "Watch live streams on ProNax." },
      { property: "og:title", content: "Live Stream — ProNax" },
      { property: "og:description", content: "Watch live streams on ProNax." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "player" },
    ],
  }),
  component: LiveWatch,
});
