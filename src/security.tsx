/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/features/pages/Settings";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — ProNax" },
      { name: "description", content: "Manage security and privacy settings for your ProNax account." },
      { property: "og:title", content: "Security — ProNax" },
      { property: "og:description", content: "Manage security and privacy settings for your ProNax account." },
    ],
  }),
  component: Settings,
});
