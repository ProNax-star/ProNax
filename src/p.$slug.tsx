/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import DynamicPage from "@/features/pages/DynamicPage";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({
    meta: [
      { title: "Page — ProNax" },
      { name: "description", content: "A ProNax information page." },
      { property: "og:title", content: "Page — ProNax" },
      { property: "og:description", content: "A ProNax information page." },
    ],
  }),
  component: DynamicPage,
});
