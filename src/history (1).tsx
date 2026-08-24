/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import History from "@/features/pages/History";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Watch history — ProNax" },
      { name: "description", content: "Everything you've watched on ProNax." },
      { property: "og:title", content: "Watch history — ProNax" },
      { property: "og:description", content: "Everything you've watched on ProNax." },
    ],
  }),
  component: History,
});
