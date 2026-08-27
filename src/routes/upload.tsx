/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Upload from "@/features/pages/Upload";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload — ProNax" },
      { name: "description", content: "Upload a new video to your ProNax channel." },
      { property: "og:title", content: "Upload — ProNax" },
      { property: "og:description", content: "Upload a new video to your ProNax channel." },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <Upload />
    </ErrorBoundary>
  ),
});
