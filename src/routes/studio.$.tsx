/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/$")({
  beforeLoad: () => {
    // Redirect to the studio dashboard route
    throw redirect({ to: "/studio/dashboard" });
  },
});
