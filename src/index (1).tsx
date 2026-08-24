/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Index from "@/features/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — ProNax" },
      { name: "description", content: "Discover trending videos, shorts and live streams on ProNax." },
      { property: "og:title", content: "Home — ProNax" },
      { property: "og:description", content: "Discover trending videos, shorts and live streams on ProNax." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});
