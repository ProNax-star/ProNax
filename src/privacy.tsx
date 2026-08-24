/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import SecurityPrivacy from "@/features/pages/SecurityPrivacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Security & Privacy — ProNax" },
      {
        name: "description",
        content:
          "Manage your ProNax account security, active sessions, cookie consent, data export and account deletion.",
      },
      { property: "og:title", content: "Security & Privacy — ProNax" },
      {
        property: "og:description",
        content:
          "Account security, sessions, cookie consent and GDPR data controls for your ProNax account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPrivacy,
});
