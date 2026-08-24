/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import OAuthConsent from "@/features/pages/OAuthConsent";

export const Route = createFileRoute("/pronax/oauth/consent")({
  head: () => ({
    meta: [
      { title: "Authorize app — ProNax" },
      { name: "description", content: "Approve or deny access for an app connecting to your ProNax account." },
      { property: "og:title", content: "Authorize app — ProNax" },
      { property: "og:description", content: "Approve or deny access for an app connecting to your ProNax account." },
    ],
  }),
  component: OAuthConsent,
});
