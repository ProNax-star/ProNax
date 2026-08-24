/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/features/pages/Admin";

export const Route = createFileRoute("/admin/engine")({
  head: () => ({
    meta: [
      { title: "Admin — ProNax" },
      { name: "description", content: "ProNax platform administration console." },
      { property: "og:title", content: "Admin — ProNax" },
      { property: "og:description", content: "ProNax platform administration console." },
    ],
  }),
  component: Admin,
});
