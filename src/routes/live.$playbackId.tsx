/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import LiveWatch from "@/features/pages/LiveWatch";

export const Route = createFileRoute("/live/$playbackId")({
  head: () => ({
    meta: [
      { title: "Live — ProNax" },
      { name: "description", content: "Watch a live stream on ProNax." },
      { property: "og:title", content: "Live — ProNax" },
      { property: "og:description", content: "Watch a live stream on ProNax." },
    ],
  }),
  component: LiveWatch,
});
