/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Trending from "@/features/pages/Trending";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending — ProNax" },
      { name: "description", content: "See what's trending right now across ProNax." },
      { property: "og:title", content: "Trending — ProNax" },
      { property: "og:description", content: "See what's trending right now across ProNax." },
    ],
  }),
  component: Trending,
});
