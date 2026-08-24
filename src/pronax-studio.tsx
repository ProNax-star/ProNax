/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import PronaxStudio from "@/features/pages/PronaxStudio";

export const Route = createFileRoute("/pronax-studio")({
  head: () => ({
    meta: [
      { title: "ProNax Studio — ProNax" },
      { name: "description", content: "Manage videos, analytics and monetization in ProNax Studio." },
      { property: "og:title", content: "ProNax Studio — ProNax" },
      { property: "og:description", content: "Manage videos, analytics and monetization in ProNax Studio." },
    ],
  }),
  component: PronaxStudio,
});
