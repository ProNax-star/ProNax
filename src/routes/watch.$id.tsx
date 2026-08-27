/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Watch from "@/features/pages/Watch";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/watch/$id")({
  head: () => ({
    meta: [
      { title: "Watch — ProNax" },
      { name: "description", content: "Watch videos, comment and support creators on ProNax." },
      { property: "og:title", content: "Watch — ProNax" },
      { property: "og:description", content: "Watch videos, comment and support creators on ProNax." },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <Watch />
    </ErrorBoundary>
  ),
});
