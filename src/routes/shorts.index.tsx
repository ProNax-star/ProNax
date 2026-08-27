/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Shorts from "@/features/pages/Shorts";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/shorts/")({
  head: () => ({
    meta: [
      { title: "Shorts — ProNax" },
      { name: "description", content: "Swipe through short vertical videos on ProNax." },
      { property: "og:title", content: "Shorts — ProNax" },
      { property: "og:description", content: "Swipe through short vertical videos on ProNax." },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <Shorts />
    </ErrorBoundary>
  ),
});
