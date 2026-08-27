/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import PronaxStudio from "@/features/pages/PronaxStudio";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/studio/dashboard")({
  head: () => ({
    meta: [
      { title: "Studio — ProNax" },
      { name: "description", content: "Manage videos, analytics and monetization in ProNax Studio." },
      { property: "og:title", content: "Studio — ProNax" },
      { property: "og:description", content: "Manage videos, analytics and monetization in ProNax Studio." },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <PronaxStudio />
    </ErrorBoundary>
  ),
});