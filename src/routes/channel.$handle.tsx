/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/features/pages/Profile";

export const Route = createFileRoute("/channel/$handle")({
  head: () => ({
    meta: [
      { title: "Channel — ProNax" },
      { name: "description", content: "View a creator's ProNax channel, videos and shorts." },
      { property: "og:title", content: "Channel — ProNax" },
      { property: "og:description", content: "View a creator's ProNax channel, videos and shorts." },
    ],
  }),
  component: Profile,
});
