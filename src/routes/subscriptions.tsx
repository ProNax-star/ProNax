/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Subscriptions from "@/features/pages/Subscriptions";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — ProNax" },
      { name: "description", content: "New videos from the channels you subscribe to." },
      { property: "og:title", content: "Subscriptions — ProNax" },
      { property: "og:description", content: "New videos from the channels you subscribe to." },
    ],
  }),
  component: Subscriptions,
});
